-- Soles Phase 8: completed trips become read-only memories.

create function private.trip_accepts_content_writes(p_trip_id uuid)
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
      and trip.status <> 'completed'
      and member.user_id = auth.uid()
  );
$$;

create function private.enforce_completed_trip_read_only()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_trip_id uuid;
  v_status public.trip_status;
  v_context text := current_setting('soles.trip_write_context', true);
begin
  if tg_table_name = 'trips' then
    if old.status = 'completed' then
      if tg_op = 'UPDATE'
        and new.status = 'active'
        and v_context = format('lifecycle:%s:%s', old.id, auth.uid()) then
        return new;
      end if;

      raise exception 'Completed trips must be reopened before editing'
        using errcode = '42501';
    end if;
    return new;
  end if;

  v_trip_id := case when tg_op = 'DELETE' then old.trip_id else new.trip_id end;

  select status
  into v_status
  from public.trips
  where id = v_trip_id;

  if v_status = 'completed' then
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

    raise exception 'Completed trip content is read-only until the owner reopens it'
      using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger trips_memory_read_only
before update on public.trips
for each row execute function private.enforce_completed_trip_read_only();

create trigger trip_members_memory_read_only
before insert or update or delete on public.trip_members
for each row execute function private.enforce_completed_trip_read_only();

create trigger trip_invites_memory_read_only
before insert or update or delete on public.trip_invites
for each row execute function private.enforce_completed_trip_read_only();

create trigger activities_memory_read_only
before insert or update or delete on public.activities
for each row execute function private.enforce_completed_trip_read_only();

create trigger photos_memory_read_only
before insert or update or delete on public.photos
for each row execute function private.enforce_completed_trip_read_only();

drop policy trips_update_manager on public.trips;
create policy trips_update_manager
on public.trips
for update
to authenticated
using (
  deleted_at is null
  and private.can_manage_trip(id)
  and private.trip_accepts_content_writes(id)
)
with check (
  private.can_manage_trip(id)
  and private.trip_accepts_content_writes(id)
);

drop policy trip_members_update_owner_or_self on public.trip_members;
create policy trip_members_update_owner_or_self
on public.trip_members
for update
to authenticated
using (
  user_id = auth.uid()
  or (
    private.trip_accepts_content_writes(trip_id)
    and private.current_trip_role(trip_id) = 'owner'
  )
)
with check (
  user_id = auth.uid()
  or (
    private.trip_accepts_content_writes(trip_id)
    and private.current_trip_role(trip_id) = 'owner'
  )
);

drop policy trip_members_delete_authorized on public.trip_members;
create policy trip_members_delete_authorized
on public.trip_members
for delete
to authenticated
using (
  private.trip_accepts_content_writes(trip_id)
  and (
    user_id = auth.uid()
    or private.current_trip_role(trip_id) = 'owner'
    or (private.current_trip_role(trip_id) = 'admin' and role = 'member')
  )
);

drop policy trip_invites_update_manager on public.trip_invites;
create policy trip_invites_update_manager
on public.trip_invites
for update
to authenticated
using (
  private.trip_accepts_content_writes(trip_id)
  and private.can_manage_trip(trip_id)
)
with check (
  private.trip_accepts_content_writes(trip_id)
  and private.can_manage_trip(trip_id)
);

drop policy activities_insert_member on public.activities;
create policy activities_insert_member
on public.activities
for insert
to authenticated
with check (
  created_by = auth.uid()
  and private.trip_accepts_content_writes(trip_id)
);

drop policy activities_update_author_or_manager on public.activities;
create policy activities_update_author_or_manager
on public.activities
for update
to authenticated
using (
  private.trip_accepts_content_writes(trip_id)
  and (private.can_manage_trip(trip_id) or created_by = auth.uid())
)
with check (
  private.trip_accepts_content_writes(trip_id)
  and (private.can_manage_trip(trip_id) or created_by = auth.uid())
);

drop policy photos_insert_member on public.photos;
create policy photos_insert_member
on public.photos
for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and private.trip_accepts_content_writes(trip_id)
);

drop policy photos_update_uploader_or_manager on public.photos;
create policy photos_update_uploader_or_manager
on public.photos
for update
to authenticated
using (
  private.trip_accepts_content_writes(trip_id)
  and (private.can_manage_trip(trip_id) or uploaded_by = auth.uid())
)
with check (
  private.trip_accepts_content_writes(trip_id)
  and (private.can_manage_trip(trip_id) or uploaded_by = auth.uid())
);

drop policy trip_covers_insert_manager on storage.objects;
create policy trip_covers_insert_manager
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'trip-covers'
  and private.can_manage_trip(private.trip_cover_trip_id(name))
  and private.trip_accepts_content_writes(private.trip_cover_trip_id(name))
);

drop policy trip_covers_update_manager on storage.objects;
create policy trip_covers_update_manager
on storage.objects
for update
to authenticated
using (
  bucket_id = 'trip-covers'
  and private.can_manage_trip(private.trip_cover_trip_id(name))
  and private.trip_accepts_content_writes(private.trip_cover_trip_id(name))
)
with check (
  bucket_id = 'trip-covers'
  and private.can_manage_trip(private.trip_cover_trip_id(name))
  and private.trip_accepts_content_writes(private.trip_cover_trip_id(name))
);

drop policy trip_covers_delete_manager on storage.objects;
create policy trip_covers_delete_manager
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'trip-covers'
  and private.can_manage_trip(private.trip_cover_trip_id(name))
  and private.trip_accepts_content_writes(private.trip_cover_trip_id(name))
);

drop policy trip_photos_insert_member on storage.objects;
create policy trip_photos_insert_member
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'trip-photos'
  and owner_id = auth.uid()::text
  and private.trip_accepts_content_writes(private.trip_photo_trip_id(name))
);

drop policy trip_photos_delete_uploader_or_manager on storage.objects;
create policy trip_photos_delete_uploader_or_manager
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'trip-photos'
  and private.trip_accepts_content_writes(private.trip_photo_trip_id(name))
  and (
    owner_id = auth.uid()::text
    or private.can_manage_trip_photo_object(name)
  )
);

revoke execute on function private.trip_accepts_content_writes(uuid)
  from public, anon;
grant execute on function private.trip_accepts_content_writes(uuid)
  to authenticated;
revoke all on function private.enforce_completed_trip_read_only()
  from public, anon, authenticated;

comment on function private.trip_accepts_content_writes(uuid) is
  'Allows authenticated trip members to mutate content only before completion.';
comment on function private.enforce_completed_trip_read_only() is
  'Freezes completed trip content while preserving comments, reads, owner reopen, and self archive.';
