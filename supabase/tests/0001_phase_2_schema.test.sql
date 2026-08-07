begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select no_plan();

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'trips', 'trips table exists');
select has_table('public', 'trip_members', 'trip_members table exists');
select has_table('public', 'trip_invites', 'trip_invites table exists');
select has_table('public', 'activities', 'activities table exists');
select has_table('public', 'photos', 'photos table exists');
select has_table('public', 'comments', 'comments table exists');

select has_function('public', 'create_trip', 'create_trip RPC exists');
select has_function('public', 'create_trip_invite', 'create_trip_invite RPC exists');
select has_function('public', 'accept_trip_invite', 'accept_trip_invite RPC exists');
select has_function('public', 'transfer_trip_ownership', 'ownership transfer RPC exists');
select has_function('public', 'set_trip_status', 'trip lifecycle RPC exists');
select has_function('public', 'set_trip_deleted', 'trip soft-delete RPC exists');

select is(
  (
    select bool_and(class.relrowsecurity)
    from pg_catalog.pg_class as class
    join pg_catalog.pg_namespace as namespace on namespace.oid = class.relnamespace
    where namespace.nspname = 'public'
      and class.relname in (
        'profiles',
        'trips',
        'trip_members',
        'trip_invites',
        'activities',
        'photos',
        'comments'
      )
  ),
  true,
  'RLS is enabled on every exposed Phase 2 table'
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
) values
  (
    '11111111-1111-4111-8111-111111111111',
    'authenticated',
    'authenticated',
    'owner@example.com',
    '',
    now(),
    '{}'::jsonb,
    '{}'::jsonb
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'authenticated',
    'authenticated',
    'member@example.com',
    '',
    now(),
    '{}'::jsonb,
    '{}'::jsonb
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'authenticated',
    'authenticated',
    'outsider@example.com',
    '',
    now(),
    '{}'::jsonb,
    '{}'::jsonb
  );

insert into public.profiles (id, display_name)
values
  ('11111111-1111-4111-8111-111111111111', 'Owner'),
  ('22222222-2222-4222-8222-222222222222', 'Member'),
  ('33333333-3333-4333-8333-333333333333', 'Outsider')
on conflict (id) do update set display_name = excluded.display_name;

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","email":"owner@example.com","role":"authenticated"}',
  true
);

select lives_ok(
  $$
    select public.create_trip(
      'Bariloche 2027',
      'Bariloche, Argentina',
      '2027-01-10',
      '2027-01-17',
      'America/Argentina/Buenos_Aires'
    )
  $$,
  'trip creation and owner membership are atomic'
);

select is(
  (
    select count(*)::integer
    from public.trip_members
    where trip_id = (select id from public.trips where name = 'Bariloche 2027')
      and role = 'owner'
  ),
  1,
  'a created trip has exactly one owner'
);

select lives_ok(
  $$
    select public.create_trip_invite(
      (select id from public.trips where name = 'Bariloche 2027'),
      repeat('a', 64),
      now() + interval '1 day',
      'member',
      'member@example.com',
      1
    )
  $$,
  'an owner can create a hashed invitation'
);

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","email":"member@example.com","role":"authenticated"}',
  true
);

select lives_ok(
  $$ select public.accept_trip_invite(repeat('a', 64)) $$,
  'a matching user can accept an available invitation'
);

select is(
  (select use_count from public.trip_invites where token_hash = repeat('a', 64)),
  1,
  'accepting an invitation consumes one use'
);

select is(
  (
    select count(*)::integer
    from public.trip_members
    where trip_id = (select id from public.trips where name = 'Bariloche 2027')
  ),
  2,
  'accepting an invitation creates one membership'
);

select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-4333-8333-333333333333","email":"outsider@example.com","role":"authenticated"}',
  true
);

select is(
  (select count(*)::integer from public.trips),
  0,
  'an unrelated authenticated user cannot read the trip'
);

select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","email":"owner@example.com","role":"authenticated"}',
  true
);

select lives_ok(
  $$
    select public.transfer_trip_ownership(
      (select id from public.trips where name = 'Bariloche 2027'),
      '22222222-2222-4222-8222-222222222222',
      'admin'
    )
  $$,
  'the current owner can transfer ownership atomically'
);

select is(
  (
    select count(*)::integer
    from public.trip_members
    where trip_id = (select id from public.trips where name = 'Bariloche 2027')
      and role = 'owner'
  ),
  1,
  'ownership transfer preserves exactly one owner'
);

select is(
  (
    select role::text
    from public.trip_members
    where trip_id = (select id from public.trips where name = 'Bariloche 2027')
      and user_id = '22222222-2222-4222-8222-222222222222'
  ),
  'owner',
  'the selected member becomes the owner'
);

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","email":"member@example.com","role":"authenticated"}',
  true
);

select throws_ok(
  $$
    delete from public.trip_members
    where trip_id = (select id from public.trips where name = 'Bariloche 2027')
      and user_id = '22222222-2222-4222-8222-222222222222'
  $$,
  'an owner cannot leave before transferring ownership'
);

select throws_ok(
  $$
    select public.create_trip(
      'Invalid dates',
      'Nowhere',
      '2027-05-20',
      '2027-05-19',
      'UTC'
    )
  $$,
  'a trip cannot end before it starts'
);

select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","email":"owner@example.com","role":"authenticated"}',
  true
);

select throws_ok(
  $$
    update public.trips
    set status = 'completed', completed_at = now()
    where name = 'Bariloche 2027'
  $$,
  'lifecycle changes cannot bypass the owner RPC'
);

insert into public.activities (
  trip_id,
  created_by,
  title,
  activity_date,
  timezone
)
select
  id,
  '11111111-1111-4111-8111-111111111111',
  'Circuito Chico',
  '2027-01-11',
  'America/Argentina/Buenos_Aires'
from public.trips
where name = 'Bariloche 2027';

select throws_ok(
  $$
    insert into public.comments (trip_id, author_id, body)
    select
      id,
      '11111111-1111-4111-8111-111111111111',
      'Target missing'
    from public.trips
    where name = 'Bariloche 2027'
  $$,
  'a comment must target exactly one activity or photo'
);

select * from finish();
rollback;
