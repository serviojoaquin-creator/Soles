-- Soles Phase 2: authorization helpers, write guards, RLS, and atomic RPCs.

create function private.is_trip_member(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.trip_members as member
    join public.trips as trip on trip.id = member.trip_id
    where member.trip_id = p_trip_id
      and member.user_id = auth.uid()
      and trip.deleted_at is null
  );
$$;

create function private.current_trip_role(p_trip_id uuid)
returns public.trip_role
language sql
stable
security definer
set search_path = ''
as $$
  select member.role
  from public.trip_members as member
  where member.trip_id = p_trip_id
    and member.user_id = auth.uid();
$$;

create function private.can_manage_trip(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_trip_role(p_trip_id) in ('owner', 'admin'), false);
$$;

create function private.shares_trip_with(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.trip_members as mine
    join public.trip_members as theirs on theirs.trip_id = mine.trip_id
    join public.trips as trip on trip.id = mine.trip_id
    where mine.user_id = auth.uid()
      and theirs.user_id = p_profile_id
      and trip.deleted_at is null
  );
$$;

create function private.guard_profile_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'Profile identity and creation timestamp are immutable'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_write
before update on public.profiles
for each row execute function private.guard_profile_write();

create function private.guard_trip_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_actor_role public.trip_role;
  v_context text := current_setting('soles.trip_write_context', true);
begin
  if new.id is distinct from old.id
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at then
    raise exception 'Trip identity, creator, and creation timestamp are immutable'
      using errcode = '42501';
  end if;

  v_actor_role := private.current_trip_role(old.id);
  if v_actor_role not in ('owner', 'admin') then
    raise exception 'Only trip owners and admins may update a trip'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status
    or new.completed_at is distinct from old.completed_at then
    if v_actor_role <> 'owner'
      or v_context <> format('lifecycle:%s:%s', old.id, auth.uid()) then
      raise exception 'Trip lifecycle changes require the owner RPC'
        using errcode = '42501';
    end if;
  end if;

  if new.deleted_at is distinct from old.deleted_at then
    if v_actor_role <> 'owner'
      or v_context <> format('deletion:%s:%s', old.id, auth.uid()) then
      raise exception 'Trip deletion changes require the owner RPC'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

create trigger trips_guard_write
before update on public.trips
for each row execute function private.guard_trip_write();

create function private.guard_trip_member_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role public.trip_role;
  v_context text := current_setting('soles.member_write_context', true);
  v_trip_id uuid := case when tg_op = 'DELETE' then old.trip_id else new.trip_id end;
begin
  if tg_op = 'INSERT' then
    if v_context = format('create_trip:%s:%s', new.trip_id, v_actor)
      and new.user_id = v_actor
      and new.role = 'owner' then
      return new;
    end if;

    if v_context = format('accept_invite:%s:%s', new.trip_id, v_actor)
      and new.user_id = v_actor
      and new.role in ('admin', 'member') then
      return new;
    end if;

    raise exception 'Trip members must be added through an approved RPC'
      using errcode = '42501';
  end if;

  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;

  if tg_op = 'UPDATE' and v_context = format('transfer_owner:%s:%s', old.trip_id, v_actor) then
    if new.trip_id is distinct from old.trip_id
      or new.user_id is distinct from old.user_id
      or new.joined_at is distinct from old.joined_at then
      raise exception 'Membership identity and join time are immutable'
        using errcode = '42501';
    end if;
    return new;
  end if;

  v_actor_role := private.current_trip_role(v_trip_id);

  if tg_op = 'DELETE' then
    if old.role = 'owner' then
      raise exception 'An owner must transfer ownership before leaving'
        using errcode = '42501';
    end if;

    if old.user_id = v_actor
      or v_actor_role = 'owner'
      or (v_actor_role = 'admin' and old.role = 'member') then
      return old;
    end if;

    raise exception 'Membership cannot be removed by this user'
      using errcode = '42501';
  end if;

  if new.trip_id is distinct from old.trip_id
    or new.user_id is distinct from old.user_id
    or new.joined_at is distinct from old.joined_at then
    raise exception 'Membership identity and join time are immutable'
      using errcode = '42501';
  end if;

  if old.user_id = v_actor
    and new.role = old.role then
    return new;
  end if;

  if v_actor_role = 'owner'
    and old.role <> 'owner'
    and new.role in ('admin', 'member')
    and new.archived_at is not distinct from old.archived_at then
    return new;
  end if;

  raise exception 'Membership change is not permitted'
    using errcode = '42501';
end;
$$;

create trigger trip_members_guard_write
before insert or update or delete on public.trip_members
for each row execute function private.guard_trip_member_write();

create function private.guard_trip_invite_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_context text := current_setting('soles.invite_write_context', true);
begin
  if tg_op = 'INSERT' then
    if v_context = format('create_invite:%s:%s', new.trip_id, auth.uid()) then
      return new;
    end if;
    raise exception 'Invitations must be created through the invite RPC'
      using errcode = '42501';
  end if;

  if new.id is distinct from old.id
    or new.trip_id is distinct from old.trip_id
    or new.token_hash is distinct from old.token_hash
    or new.invited_email is distinct from old.invited_email
    or new.role is distinct from old.role
    or new.expires_at is distinct from old.expires_at
    or new.max_uses is distinct from old.max_uses
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at then
    raise exception 'Invitation identity and terms are immutable'
      using errcode = '42501';
  end if;

  if v_context = format('accept_invite:%s:%s', old.trip_id, auth.uid())
    and new.use_count = old.use_count + 1
    and new.revoked_at is not distinct from old.revoked_at then
    return new;
  end if;

  if private.can_manage_trip(old.trip_id)
    and new.use_count = old.use_count then
    return new;
  end if;

  raise exception 'Invitation change is not permitted'
    using errcode = '42501';
end;
$$;

create trigger trip_invites_guard_write
before insert or update on public.trip_invites
for each row execute function private.guard_trip_invite_write();

create function private.guard_activity_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id
    or new.trip_id is distinct from old.trip_id
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'Activity identity, trip, creator, and creation timestamp are immutable'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger activities_guard_write
before update on public.activities
for each row execute function private.guard_activity_write();

create function private.guard_photo_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id
    or new.trip_id is distinct from old.trip_id
    or new.uploaded_by is distinct from old.uploaded_by
    or new.storage_path is distinct from old.storage_path
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'Photo identity, trip, uploader, path, and creation timestamp are immutable'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger photos_guard_write
before update on public.photos
for each row execute function private.guard_photo_write();

create function private.guard_comment_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id
    or new.trip_id is distinct from old.trip_id
    or new.author_id is distinct from old.author_id
    or new.photo_id is distinct from old.photo_id
    or new.activity_id is distinct from old.activity_id
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'Comment identity, target, author, and creation timestamp are immutable'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger comments_guard_write
before update on public.comments
for each row execute function private.guard_comment_write();

alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.trip_invites enable row level security;
alter table public.activities enable row level security;
alter table public.photos enable row level security;
alter table public.comments enable row level security;

create policy profiles_select_related
on public.profiles
for select
to authenticated
using (
  deleted_at is null
  and (id = auth.uid() or private.shares_trip_with(id))
);

create policy profiles_insert_self
on public.profiles
for insert
to authenticated
with check (id = auth.uid() and deleted_at is null);

create policy profiles_update_self
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy trips_select_member
on public.trips
for select
to authenticated
using (deleted_at is null and private.is_trip_member(id));

create policy trips_update_manager
on public.trips
for update
to authenticated
using (deleted_at is null and private.can_manage_trip(id))
with check (private.can_manage_trip(id));

create policy trip_members_select_member
on public.trip_members
for select
to authenticated
using (private.is_trip_member(trip_id));

create policy trip_members_update_owner_or_self
on public.trip_members
for update
to authenticated
using (user_id = auth.uid() or private.current_trip_role(trip_id) = 'owner')
with check (user_id = auth.uid() or private.current_trip_role(trip_id) = 'owner');

create policy trip_members_delete_authorized
on public.trip_members
for delete
to authenticated
using (
  user_id = auth.uid()
  or private.current_trip_role(trip_id) = 'owner'
  or (private.current_trip_role(trip_id) = 'admin' and role = 'member')
);

create policy trip_invites_select_manager
on public.trip_invites
for select
to authenticated
using (private.is_trip_member(trip_id) and private.can_manage_trip(trip_id));

create policy trip_invites_update_manager
on public.trip_invites
for update
to authenticated
using (private.is_trip_member(trip_id) and private.can_manage_trip(trip_id))
with check (private.is_trip_member(trip_id) and private.can_manage_trip(trip_id));

create policy activities_select_member
on public.activities
for select
to authenticated
using (deleted_at is null and private.is_trip_member(trip_id));

create policy activities_insert_member
on public.activities
for insert
to authenticated
with check (created_by = auth.uid() and private.is_trip_member(trip_id));

create policy activities_update_author_or_manager
on public.activities
for update
to authenticated
using (private.can_manage_trip(trip_id) or created_by = auth.uid())
with check (private.can_manage_trip(trip_id) or created_by = auth.uid());

create policy photos_select_member
on public.photos
for select
to authenticated
using (deleted_at is null and private.is_trip_member(trip_id));

create policy photos_insert_member
on public.photos
for insert
to authenticated
with check (uploaded_by = auth.uid() and private.is_trip_member(trip_id));

create policy photos_update_uploader_or_manager
on public.photos
for update
to authenticated
using (private.can_manage_trip(trip_id) or uploaded_by = auth.uid())
with check (private.can_manage_trip(trip_id) or uploaded_by = auth.uid());

create policy comments_select_member
on public.comments
for select
to authenticated
using (deleted_at is null and private.is_trip_member(trip_id));

create policy comments_insert_member
on public.comments
for insert
to authenticated
with check (author_id = auth.uid() and private.is_trip_member(trip_id));

create policy comments_update_author_or_manager
on public.comments
for update
to authenticated
using (private.can_manage_trip(trip_id) or author_id = auth.uid())
with check (private.can_manage_trip(trip_id) or author_id = auth.uid());

create function public.create_trip(
  p_name text,
  p_destination text,
  p_start_date date,
  p_end_date date,
  p_default_timezone text,
  p_description text default null,
  p_cover_path text default null
)
returns public.trips
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_trip public.trips;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.profiles where id = v_actor and deleted_at is null
  ) then
    raise exception 'An active profile is required before creating a trip'
      using errcode = '23503';
  end if;

  insert into public.trips (
    created_by,
    name,
    description,
    destination,
    cover_path,
    start_date,
    end_date,
    default_timezone
  ) values (
    v_actor,
    btrim(p_name),
    nullif(btrim(p_description), ''),
    btrim(p_destination),
    nullif(btrim(p_cover_path), ''),
    p_start_date,
    p_end_date,
    p_default_timezone
  )
  returning * into v_trip;

  perform set_config(
    'soles.member_write_context',
    format('create_trip:%s:%s', v_trip.id, v_actor),
    true
  );

  insert into public.trip_members (trip_id, user_id, role)
  values (v_trip.id, v_actor, 'owner');

  perform set_config('soles.member_write_context', '', true);
  return v_trip;
end;
$$;

create function public.create_trip_invite(
  p_trip_id uuid,
  p_token_hash text,
  p_expires_at timestamptz,
  p_role public.trip_role default 'member',
  p_invited_email text default null,
  p_max_uses integer default 1
)
returns public.trip_invites
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_invite public.trip_invites;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if not private.can_manage_trip(p_trip_id) then
    raise exception 'Only trip owners and admins may create invitations'
      using errcode = '42501';
  end if;

  if p_role not in ('admin', 'member') then
    raise exception 'Invitations cannot grant the owner role'
      using errcode = '22023';
  end if;

  if p_expires_at <= statement_timestamp() then
    raise exception 'Invitation expiration must be in the future'
      using errcode = '22023';
  end if;

  perform set_config(
    'soles.invite_write_context',
    format('create_invite:%s:%s', p_trip_id, v_actor),
    true
  );

  insert into public.trip_invites (
    trip_id,
    token_hash,
    invited_email,
    role,
    expires_at,
    max_uses,
    created_by
  ) values (
    p_trip_id,
    lower(btrim(p_token_hash)),
    nullif(lower(btrim(p_invited_email)), ''),
    p_role,
    p_expires_at,
    p_max_uses,
    v_actor
  )
  returning * into v_invite;

  perform set_config('soles.invite_write_context', '', true);
  return v_invite;
end;
$$;

create function public.accept_trip_invite(p_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_email text := lower(auth.jwt() ->> 'email');
  v_invite public.trip_invites;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.profiles where id = v_actor and deleted_at is null
  ) then
    raise exception 'An active profile is required before accepting an invitation'
      using errcode = '23503';
  end if;

  select invite.*
  into v_invite
  from public.trip_invites as invite
  join public.trips as trip on trip.id = invite.trip_id
  where invite.token_hash = lower(btrim(p_token_hash))
    and trip.deleted_at is null
  for update of invite;

  if not found then
    raise exception 'Invitation is invalid' using errcode = 'P0001';
  end if;

  if v_invite.revoked_at is not null
    or v_invite.expires_at <= statement_timestamp()
    or v_invite.use_count >= v_invite.max_uses then
    raise exception 'Invitation is no longer available' using errcode = 'P0001';
  end if;

  if v_invite.invited_email is not null
    and (v_email is null or v_email <> v_invite.invited_email) then
    raise exception 'Invitation belongs to a different email address'
      using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.trip_members
    where trip_id = v_invite.trip_id and user_id = v_actor
  ) then
    return v_invite.trip_id;
  end if;

  perform set_config(
    'soles.member_write_context',
    format('accept_invite:%s:%s', v_invite.trip_id, v_actor),
    true
  );
  perform set_config(
    'soles.invite_write_context',
    format('accept_invite:%s:%s', v_invite.trip_id, v_actor),
    true
  );

  insert into public.trip_members (trip_id, user_id, role)
  values (v_invite.trip_id, v_actor, v_invite.role);

  update public.trip_invites
  set use_count = use_count + 1
  where id = v_invite.id;

  perform set_config('soles.member_write_context', '', true);
  perform set_config('soles.invite_write_context', '', true);
  return v_invite.trip_id;
end;
$$;

create function public.transfer_trip_ownership(
  p_trip_id uuid,
  p_new_owner_id uuid,
  p_previous_owner_role public.trip_role default 'admin'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_previous_owner_role not in ('admin', 'member') then
    raise exception 'Previous owner must become an admin or member'
      using errcode = '22023';
  end if;

  if p_new_owner_id = v_actor then
    raise exception 'New owner must be a different member'
      using errcode = '22023';
  end if;

  perform 1
  from public.trip_members
  where trip_id = p_trip_id
    and user_id = v_actor
    and role = 'owner'
  for update;

  if not found then
    raise exception 'Only the current owner may transfer ownership'
      using errcode = '42501';
  end if;

  perform 1
  from public.trip_members
  where trip_id = p_trip_id
    and user_id = p_new_owner_id
  for update;

  if not found then
    raise exception 'New owner must already be a trip member'
      using errcode = '23503';
  end if;

  perform set_config(
    'soles.member_write_context',
    format('transfer_owner:%s:%s', p_trip_id, v_actor),
    true
  );

  update public.trip_members
  set role = p_previous_owner_role
  where trip_id = p_trip_id and user_id = v_actor;

  update public.trip_members
  set role = 'owner'
  where trip_id = p_trip_id and user_id = p_new_owner_id;

  perform set_config('soles.member_write_context', '', true);
end;
$$;

create function public.set_trip_status(
  p_trip_id uuid,
  p_status public.trip_status
)
returns public.trips
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_current_status public.trip_status;
  v_trip public.trips;
begin
  select trip.status
  into v_current_status
  from public.trips as trip
  join public.trip_members as member on member.trip_id = trip.id
  where trip.id = p_trip_id
    and trip.deleted_at is null
    and member.user_id = v_actor
    and member.role = 'owner'
  for update of trip;

  if not found then
    raise exception 'Only the owner may change the trip lifecycle'
      using errcode = '42501';
  end if;

  if p_status <> v_current_status and not (
    (v_current_status = 'planning' and p_status in ('active', 'completed'))
    or (v_current_status = 'active' and p_status = 'completed')
    or (v_current_status = 'completed' and p_status = 'active')
  ) then
    raise exception 'Invalid trip lifecycle transition: % to %', v_current_status, p_status
      using errcode = '22023';
  end if;

  perform set_config(
    'soles.trip_write_context',
    format('lifecycle:%s:%s', p_trip_id, v_actor),
    true
  );

  update public.trips
  set status = p_status,
      completed_at = case
        when p_status = 'completed' then coalesce(completed_at, statement_timestamp())
        else null
      end
  where id = p_trip_id
  returning * into v_trip;

  perform set_config('soles.trip_write_context', '', true);
  return v_trip;
end;
$$;

create function public.set_trip_deleted(p_trip_id uuid, p_deleted boolean)
returns public.trips
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_trip public.trips;
begin
  perform 1
  from public.trip_members
  where trip_id = p_trip_id
    and user_id = v_actor
    and role = 'owner'
  for update;

  if not found then
    raise exception 'Only the owner may change trip deletion state'
      using errcode = '42501';
  end if;

  perform set_config(
    'soles.trip_write_context',
    format('deletion:%s:%s', p_trip_id, v_actor),
    true
  );

  update public.trips
  set deleted_at = case when p_deleted then statement_timestamp() else null end
  where id = p_trip_id
  returning * into v_trip;

  perform set_config('soles.trip_write_context', '', true);
  return v_trip;
end;
$$;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.trips from anon, authenticated;
revoke all on table public.trip_members from anon, authenticated;
revoke all on table public.trip_invites from anon, authenticated;
revoke all on table public.activities from anon, authenticated;
revoke all on table public.photos from anon, authenticated;
revoke all on table public.comments from anon, authenticated;

grant select, insert, update on table public.profiles to authenticated;
grant select, update on table public.trips to authenticated;
grant select, update, delete on table public.trip_members to authenticated;
grant select, update on table public.trip_invites to authenticated;
grant select, insert, update on table public.activities to authenticated;
grant select, insert, update on table public.photos to authenticated;
grant select, insert, update on table public.comments to authenticated;

grant usage on type public.trip_status to authenticated;
grant usage on type public.trip_role to authenticated;
grant usage on type public.activity_status to authenticated;

revoke execute on all functions in schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_trip_member(uuid) to authenticated;
grant execute on function private.current_trip_role(uuid) to authenticated;
grant execute on function private.can_manage_trip(uuid) to authenticated;
grant execute on function private.shares_trip_with(uuid) to authenticated;

revoke execute on function public.create_trip(text, text, date, date, text, text, text)
  from public, anon;
revoke execute on function public.create_trip_invite(uuid, text, timestamptz, public.trip_role, text, integer)
  from public, anon;
revoke execute on function public.accept_trip_invite(text) from public, anon;
revoke execute on function public.transfer_trip_ownership(uuid, uuid, public.trip_role)
  from public, anon;
revoke execute on function public.set_trip_status(uuid, public.trip_status)
  from public, anon;
revoke execute on function public.set_trip_deleted(uuid, boolean) from public, anon;

grant execute on function public.create_trip(text, text, date, date, text, text, text)
  to authenticated;
grant execute on function public.create_trip_invite(uuid, text, timestamptz, public.trip_role, text, integer)
  to authenticated;
grant execute on function public.accept_trip_invite(text) to authenticated;
grant execute on function public.transfer_trip_ownership(uuid, uuid, public.trip_role)
  to authenticated;
grant execute on function public.set_trip_status(uuid, public.trip_status)
  to authenticated;
grant execute on function public.set_trip_deleted(uuid, boolean) to authenticated;

comment on function public.create_trip(text, text, date, date, text, text, text) is
  'Atomically creates a trip and its single owner membership.';
comment on function public.accept_trip_invite(text) is
  'Atomically validates and consumes a hashed invitation, then adds the caller.';
comment on function public.transfer_trip_ownership(uuid, uuid, public.trip_role) is
  'Atomically transfers the single owner role to an existing member.';
