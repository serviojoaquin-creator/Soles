begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select no_plan();

select has_function(
  'private',
  'handle_new_user',
  'new Auth users are provisioned through a database trigger'
);

select has_function(
  'private',
  'avatar_owner_id',
  'avatar paths use a safe owner parser'
);

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data
) values (
  '44444444-4444-4444-8444-444444444444',
  'authenticated',
  'authenticated',
  'luna@example.com',
  '',
  now(),
  '{}'::jsonb,
  '{"display_name":"Luna Viajera"}'::jsonb
);

select is(
  (
    select display_name
    from public.profiles
    where id = '44444444-4444-4444-8444-444444444444'
  ),
  'Luna Viajera',
  'creating an Auth user automatically creates the public profile'
);

select is(
  private.avatar_owner_id(
    '44444444-4444-4444-8444-444444444444/avatar-123.webp'
  ),
  '44444444-4444-4444-8444-444444444444'::uuid,
  'a valid private avatar path exposes only its owner id to policies'
);

select is(
  private.avatar_owner_id('not-a-user/avatar.webp'),
  null::uuid,
  'an invalid avatar path is rejected without a cast error'
);

select is(
  (
    select public
    from storage.buckets
    where id = 'avatars'
  ),
  false,
  'the avatars bucket is private'
);

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
        'avatars_select_related',
        'avatars_insert_own',
        'avatars_update_own',
        'avatars_delete_own'
      )
  ),
  4,
  'avatar objects have select, insert, update, and delete policies'
);

select * from finish();
rollback;
