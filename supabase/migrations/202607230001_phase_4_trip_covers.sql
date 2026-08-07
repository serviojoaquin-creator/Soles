-- Soles Phase 4: private trip cover storage.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'trip-covers',
  'trip-covers',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create function private.trip_cover_trip_id(p_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when split_part(p_name, '/', 1) ~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then split_part(p_name, '/', 1)::uuid
    else null
  end;
$$;

create policy trip_covers_select_member
on storage.objects
for select
to authenticated
using (
  bucket_id = 'trip-covers'
  and private.is_trip_member(private.trip_cover_trip_id(name))
);

create policy trip_covers_insert_manager
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'trip-covers'
  and private.is_trip_member(private.trip_cover_trip_id(name))
  and private.can_manage_trip(private.trip_cover_trip_id(name))
);

create policy trip_covers_update_manager
on storage.objects
for update
to authenticated
using (
  bucket_id = 'trip-covers'
  and private.is_trip_member(private.trip_cover_trip_id(name))
  and private.can_manage_trip(private.trip_cover_trip_id(name))
)
with check (
  bucket_id = 'trip-covers'
  and private.is_trip_member(private.trip_cover_trip_id(name))
  and private.can_manage_trip(private.trip_cover_trip_id(name))
);

create policy trip_covers_delete_manager
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'trip-covers'
  and private.is_trip_member(private.trip_cover_trip_id(name))
  and private.can_manage_trip(private.trip_cover_trip_id(name))
);

revoke execute on function private.trip_cover_trip_id(text)
  from public, anon;
grant execute on function private.trip_cover_trip_id(text)
  to authenticated;

comment on function private.trip_cover_trip_id(text) is
  'Safely extracts the trip UUID from a private trip cover object path.';
