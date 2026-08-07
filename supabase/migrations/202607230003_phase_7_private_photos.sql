-- Soles Phase 7: private shared trip photo storage.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'trip-photos',
  'trip-photos',
  false,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create function private.trip_photo_trip_id(p_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when p_name ~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
    then split_part(p_name, '/', 1)::uuid
    else null
  end;
$$;

create function private.can_manage_trip_photo_object(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.photos as photo
    join public.trip_members as member on member.trip_id = photo.trip_id
    join public.trips as trip on trip.id = photo.trip_id
    where photo.storage_path = p_name
      and member.user_id = auth.uid()
      and trip.deleted_at is null
      and (
        photo.uploaded_by = auth.uid()
        or member.role in ('owner', 'admin')
      )
  );
$$;

create policy trip_photos_select_member
on storage.objects
for select
to authenticated
using (
  bucket_id = 'trip-photos'
  and private.is_trip_member(private.trip_photo_trip_id(name))
);

create policy trip_photos_insert_member
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'trip-photos'
  and private.is_trip_member(private.trip_photo_trip_id(name))
  and owner_id = auth.uid()::text
);

create policy trip_photos_delete_uploader_or_manager
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'trip-photos'
  and private.is_trip_member(private.trip_photo_trip_id(name))
  and (
    owner_id = auth.uid()::text
    or private.can_manage_trip_photo_object(name)
  )
);

revoke execute on function private.trip_photo_trip_id(text)
  from public, anon;
revoke execute on function private.can_manage_trip_photo_object(text)
  from public, anon;
grant execute on function private.trip_photo_trip_id(text)
  to authenticated;
grant execute on function private.can_manage_trip_photo_object(text)
  to authenticated;

comment on function private.trip_photo_trip_id(text) is
  'Safely extracts the trip UUID from a private trip photo object path.';
comment on function private.can_manage_trip_photo_object(text) is
  'Allows a photo uploader or trip manager to remove the corresponding private object.';
