-- Soles: owners may choose whether a completed trip remains editable.

alter table public.trips
  add column allow_completed_edits boolean not null default false;

create or replace function private.trip_accepts_content_writes(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.trips as trip
    join public.trip_members as member on member.trip_id = trip.id
    where trip.id = p_trip_id
      and trip.deleted_at is null
      and (trip.status <> 'completed' or trip.allow_completed_edits)
      and member.user_id = auth.uid()
  );
$$;

create or replace function private.guard_trip_write()
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

  if new.allow_completed_edits is distinct from old.allow_completed_edits then
    if v_actor_role <> 'owner'
      or v_context <> format('completed-editing:%s:%s', old.id, auth.uid()) then
      raise exception 'Completed editing changes require the owner RPC'
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

create or replace function private.enforce_completed_trip_read_only()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_trip_id uuid;
  v_status public.trip_status;
  v_allow_completed_edits boolean;
  v_context text := current_setting('soles.trip_write_context', true);
begin
  if tg_table_name = 'trips' then
    if old.status = 'completed' and not old.allow_completed_edits then
      if tg_op = 'UPDATE'
        and new.status = 'active'
        and v_context = format('lifecycle:%s:%s', old.id, auth.uid()) then
        return new;
      end if;

      if tg_op = 'UPDATE'
        and new.allow_completed_edits is distinct from old.allow_completed_edits
        and new.status is not distinct from old.status
        and new.completed_at is not distinct from old.completed_at
        and new.name is not distinct from old.name
        and new.description is not distinct from old.description
        and new.destination is not distinct from old.destination
        and new.start_date is not distinct from old.start_date
        and new.end_date is not distinct from old.end_date
        and new.default_timezone is not distinct from old.default_timezone
        and new.cover_path is not distinct from old.cover_path
        and new.deleted_at is not distinct from old.deleted_at
        and v_context = format('completed-editing:%s:%s', old.id, auth.uid()) then
        return new;
      end if;

      raise exception 'Completed trips must be unlocked or reopened before editing'
        using errcode = '42501';
    end if;
    return new;
  end if;

  v_trip_id := case when tg_op = 'DELETE' then old.trip_id else new.trip_id end;

  select status, allow_completed_edits
  into v_status, v_allow_completed_edits
  from public.trips
  where id = v_trip_id;

  if v_status = 'completed' and not v_allow_completed_edits then
    if tg_table_name = 'trip_members'
      and tg_op = 'UPDATE'
      and new.trip_id is not distinct from old.trip_id
      and new.user_id is not distinct from old.user_id
      and new.role is not distinct from old.role
      and new.joined_at is not distinct from old.joined_at
      and new.archived_at is distinct from old.archived_at
      and new.user_id = auth.uid() then
      return new;
    end if;

    raise exception 'Completed trip content is read-only until the owner enables editing or reopens it'
      using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create function public.set_trip_completed_editing(
  p_trip_id uuid,
  p_allow_edits boolean
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

  perform 1
  from public.trip_members
  where trip_id = p_trip_id
    and user_id = v_actor
    and role = 'owner'
  for update;

  if not found then
    raise exception 'Only the owner may change completed trip editing' using errcode = '42501';
  end if;

  perform set_config(
    'soles.trip_write_context',
    format('completed-editing:%s:%s', p_trip_id, v_actor),
    true
  );

  update public.trips
  set allow_completed_edits = p_allow_edits
  where id = p_trip_id
    and status = 'completed'
    and deleted_at is null
  returning * into v_trip;

  if v_trip.id is null then
    raise exception 'Only completed trips can change completed editing' using errcode = '22023';
  end if;

  perform set_config('soles.trip_write_context', '', true);
  return v_trip;
end;
$$;

create or replace function public.soft_delete_photo(
  p_trip_id uuid,
  p_photo_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_uploader uuid;
  v_role public.trip_role;
  v_status public.trip_status;
  v_allow_completed_edits boolean;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select photo.uploaded_by, member.role, trip.status, trip.allow_completed_edits
  into v_uploader, v_role, v_status, v_allow_completed_edits
  from public.photos as photo
  join public.trips as trip on trip.id = photo.trip_id
  join public.trip_members as member on member.trip_id = photo.trip_id
  where photo.id = p_photo_id
    and photo.trip_id = p_trip_id
    and photo.deleted_at is null
    and trip.deleted_at is null
    and member.user_id = v_actor
  for update of photo;

  if not found then return false; end if;
  if v_status = 'completed' and not v_allow_completed_edits then
    raise exception 'Completed trip photos are read-only' using errcode = '42501';
  end if;
  if v_uploader <> v_actor and v_role not in ('owner', 'admin') then
    raise exception 'Photo cannot be moderated by this user' using errcode = '42501';
  end if;

  update public.photos set deleted_at = statement_timestamp()
  where id = p_photo_id and trip_id = p_trip_id;
  return true;
end;
$$;

create or replace function public.soft_delete_activity(
  p_trip_id uuid,
  p_activity_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_author uuid;
  v_role public.trip_role;
  v_status public.trip_status;
  v_allow_completed_edits boolean;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select activity.created_by, member.role, trip.status, trip.allow_completed_edits
  into v_author, v_role, v_status, v_allow_completed_edits
  from public.activities as activity
  join public.trips as trip on trip.id = activity.trip_id
  join public.trip_members as member on member.trip_id = activity.trip_id
  where activity.id = p_activity_id
    and activity.trip_id = p_trip_id
    and activity.deleted_at is null
    and trip.deleted_at is null
    and member.user_id = v_actor
  for update of activity;

  if not found then return false; end if;
  if v_status = 'completed' and not v_allow_completed_edits then
    raise exception 'Completed trip activities are read-only' using errcode = '42501';
  end if;
  if v_author <> v_actor and v_role not in ('owner', 'admin') then
    raise exception 'Activity cannot be moderated by this user' using errcode = '42501';
  end if;

  update public.activities set deleted_at = statement_timestamp()
  where id = p_activity_id and trip_id = p_trip_id;
  return true;
end;
$$;

revoke execute on function public.set_trip_completed_editing(uuid, boolean) from public, anon;
grant execute on function public.set_trip_completed_editing(uuid, boolean) to authenticated;
revoke all on function private.enforce_completed_trip_read_only() from public, anon, authenticated;

comment on column public.trips.allow_completed_edits is
  'Owner-selected option allowing normal role-based writes while the trip remains completed.';
comment on function public.set_trip_completed_editing(uuid, boolean) is
  'Owner-only atomic toggle for editing a completed trip without changing its lifecycle state.';
comment on function private.trip_accepts_content_writes(uuid) is
  'Allows authenticated trip members to mutate content before completion or when the owner enabled completed editing.';
