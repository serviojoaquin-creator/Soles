-- Soles Phase 3: profile provisioning and private avatar storage policies.

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_display_name text;
begin
  v_display_name := nullif(btrim(new.raw_user_meta_data ->> 'display_name'), '');

  if v_display_name is null then
    v_display_name := nullif(split_part(coalesce(new.email, ''), '@', 1), '');
  end if;

  v_display_name := left(coalesce(v_display_name, 'Viajero'), 80);

  insert into public.profiles (id, display_name)
  values (new.id, v_display_name)
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger auth_users_create_profile
after insert on auth.users
for each row execute function private.handle_new_user();

insert into public.profiles (id, display_name)
select
  auth_user.id,
  left(
    coalesce(
      nullif(btrim(auth_user.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(auth_user.email, ''), '@', 1), ''),
      'Viajero'
    ),
    80
  )
from auth.users as auth_user
on conflict (id) do nothing;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'avatars',
  'avatars',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create function private.avatar_owner_id(p_name text)
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

create policy avatars_select_related
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatars'
  and (
    private.avatar_owner_id(name) = auth.uid()
    or private.shares_trip_with(private.avatar_owner_id(name))
  )
);

create policy avatars_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and private.avatar_owner_id(name) = auth.uid()
);

create policy avatars_update_own
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and private.avatar_owner_id(name) = auth.uid()
)
with check (
  bucket_id = 'avatars'
  and private.avatar_owner_id(name) = auth.uid()
);

create policy avatars_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and private.avatar_owner_id(name) = auth.uid()
);

revoke execute on function private.handle_new_user() from public, anon, authenticated;
revoke execute on function private.avatar_owner_id(text) from public, anon;
grant execute on function private.avatar_owner_id(text) to authenticated;

comment on function private.handle_new_user() is
  'Creates a constrained public profile after Supabase Auth provisions a user.';
comment on function private.avatar_owner_id(text) is
  'Safely extracts the owning user UUID from an avatars object path.';
