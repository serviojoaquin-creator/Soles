-- Soles Phase 2: relational model, invariants, indexes, and consistency triggers.

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

create type public.trip_status as enum ('planning', 'active', 'completed');
create type public.trip_role as enum ('owner', 'admin', 'member');
create type public.activity_status as enum ('planned', 'done', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete restrict,
  display_name text not null,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint profiles_display_name_length
    check (char_length(btrim(display_name)) between 1 and 80),
  constraint profiles_avatar_path_not_blank
    check (avatar_path is null or char_length(btrim(avatar_path)) > 0)
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete restrict,
  name text not null,
  description text,
  destination text not null,
  cover_path text,
  start_date date not null,
  end_date date not null,
  default_timezone text not null,
  status public.trip_status not null default 'planning',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint trips_name_length check (char_length(btrim(name)) between 1 and 120),
  constraint trips_description_length
    check (description is null or char_length(description) <= 4000),
  constraint trips_destination_length
    check (char_length(btrim(destination)) between 1 and 160),
  constraint trips_cover_path_not_blank
    check (cover_path is null or char_length(btrim(cover_path)) > 0),
  constraint trips_date_order check (end_date >= start_date),
  constraint trips_completion_consistency check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed' and completed_at is null)
  )
);

create table public.trip_members (
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete restrict,
  role public.trip_role not null default 'member',
  joined_at timestamptz not null default now(),
  archived_at timestamptz,
  primary key (trip_id, user_id)
);

create table public.trip_invites (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  token_hash text not null unique,
  invited_email text,
  role public.trip_role not null default 'member',
  expires_at timestamptz not null,
  max_uses integer not null default 1,
  use_count integer not null default 0,
  revoked_at timestamptz,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint trip_invites_token_hash_sha256
    check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint trip_invites_email_normalized
    check (
      invited_email is null
      or (
        invited_email = lower(btrim(invited_email))
        and invited_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
      )
    ),
  constraint trip_invites_non_owner_role check (role in ('admin', 'member')),
  constraint trip_invites_positive_max_uses check (max_uses > 0),
  constraint trip_invites_valid_use_count check (
    use_count >= 0 and use_count <= max_uses
  )
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete restrict,
  title text not null,
  description text,
  activity_date date not null,
  start_time time,
  end_time time,
  timezone text not null,
  location_name text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  status public.activity_status not null default 'planned',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint activities_title_length
    check (char_length(btrim(title)) between 1 and 160),
  constraint activities_description_length
    check (description is null or char_length(description) <= 4000),
  constraint activities_time_order
    check (end_time is null or (start_time is not null and end_time > start_time)),
  constraint activities_coordinates_pair
    check ((latitude is null) = (longitude is null)),
  constraint activities_latitude_range
    check (latitude is null or latitude between -90 and 90),
  constraint activities_longitude_range
    check (longitude is null or longitude between -180 and 180),
  constraint activities_non_negative_position check (position >= 0)
);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  activity_id uuid references public.activities (id) on delete set null,
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  width integer,
  height integer,
  description text,
  taken_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint photos_storage_path_not_blank check (char_length(btrim(storage_path)) > 0),
  constraint photos_original_name_not_blank check (char_length(btrim(original_name)) > 0),
  constraint photos_supported_mime
    check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  constraint photos_positive_size check (size_bytes > 0),
  constraint photos_dimensions_pair check ((width is null) = (height is null)),
  constraint photos_positive_dimensions
    check (width is null or (width > 0 and height > 0)),
  constraint photos_description_length
    check (description is null or char_length(description) <= 2000)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete restrict,
  photo_id uuid references public.photos (id) on delete cascade,
  activity_id uuid references public.activities (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint comments_exactly_one_target
    check (num_nonnulls(photo_id, activity_id) = 1),
  constraint comments_body_length check (char_length(btrim(body)) between 1 and 2000)
);

create unique index trip_members_one_owner_per_trip_idx
  on public.trip_members (trip_id)
  where role = 'owner';

create index trips_created_by_idx on public.trips (created_by);
create index trips_status_dates_idx
  on public.trips (status, start_date, end_date)
  where deleted_at is null;
create index trips_created_at_idx on public.trips (created_at desc);

create index trip_members_user_id_idx on public.trip_members (user_id);
create index trip_members_user_archive_idx
  on public.trip_members (user_id, archived_at, joined_at desc);

create index trip_invites_trip_id_idx on public.trip_invites (trip_id);
create index trip_invites_active_idx
  on public.trip_invites (trip_id, expires_at)
  where revoked_at is null;
create index trip_invites_email_idx
  on public.trip_invites (invited_email)
  where invited_email is not null;

create index activities_trip_day_position_idx
  on public.activities (trip_id, activity_date, position, created_at)
  where deleted_at is null;
create index activities_created_by_idx on public.activities (created_by);
create index activities_status_idx
  on public.activities (trip_id, status)
  where deleted_at is null;

create index photos_trip_created_idx
  on public.photos (trip_id, created_at desc)
  where deleted_at is null;
create index photos_activity_idx
  on public.photos (activity_id)
  where activity_id is not null and deleted_at is null;
create index photos_uploaded_by_idx on public.photos (uploaded_by);

create index comments_trip_created_idx
  on public.comments (trip_id, created_at)
  where deleted_at is null;
create index comments_photo_created_idx
  on public.comments (photo_id, created_at)
  where photo_id is not null and deleted_at is null;
create index comments_activity_created_idx
  on public.comments (activity_id, created_at)
  where activity_id is not null and deleted_at is null;
create index comments_author_id_idx on public.comments (author_id);

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := statement_timestamp();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger trips_set_updated_at
before update on public.trips
for each row execute function private.set_updated_at();

create trigger activities_set_updated_at
before update on public.activities
for each row execute function private.set_updated_at();

create trigger photos_set_updated_at
before update on public.photos
for each row execute function private.set_updated_at();

create trigger comments_set_updated_at
before update on public.comments
for each row execute function private.set_updated_at();

create function private.is_valid_timezone(p_timezone text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from pg_catalog.pg_timezone_names
    where name = p_timezone
  );
$$;

create function private.validate_trip_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not private.is_valid_timezone(new.default_timezone) then
    raise exception 'Invalid IANA timezone: %', new.default_timezone
      using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger trips_validate_timezone
before insert or update of default_timezone on public.trips
for each row execute function private.validate_trip_timezone();

create function private.validate_activity_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not private.is_valid_timezone(new.timezone) then
    raise exception 'Invalid IANA timezone: %', new.timezone
      using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger activities_validate_timezone
before insert or update of timezone on public.activities
for each row execute function private.validate_activity_timezone();

create function private.validate_photo_activity_trip()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.activity_id is not null and not exists (
    select 1
    from public.activities
    where id = new.activity_id
      and trip_id = new.trip_id
  ) then
    raise exception 'Photo activity must belong to the same trip'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger photos_validate_activity_trip
before insert or update of trip_id, activity_id on public.photos
for each row execute function private.validate_photo_activity_trip();

create function private.validate_comment_target_trip()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.photo_id is not null and not exists (
    select 1
    from public.photos
    where id = new.photo_id
      and trip_id = new.trip_id
  ) then
    raise exception 'Comment photo must belong to the same trip'
      using errcode = '23514';
  end if;

  if new.activity_id is not null and not exists (
    select 1
    from public.activities
    where id = new.activity_id
      and trip_id = new.trip_id
  ) then
    raise exception 'Comment activity must belong to the same trip'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger comments_validate_target_trip
before insert or update of trip_id, photo_id, activity_id on public.comments
for each row execute function private.validate_comment_target_trip();

create function private.assert_trip_has_one_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trip_id uuid;
  v_owner_count integer;
begin
  if tg_table_name = 'trips' then
    if tg_op = 'DELETE' then
      return null;
    end if;
    v_trip_id := new.id;
  elsif tg_op = 'DELETE' then
    v_trip_id := old.trip_id;
  else
    v_trip_id := new.trip_id;
  end if;

  if not exists (select 1 from public.trips where id = v_trip_id) then
    return null;
  end if;

  select count(*)::integer
  into v_owner_count
  from public.trip_members
  where trip_id = v_trip_id
    and role = 'owner';

  if v_owner_count <> 1 then
    raise exception 'Trip % must have exactly one owner', v_trip_id
      using errcode = '23514';
  end if;

  return null;
end;
$$;

create constraint trigger trips_require_one_owner
after insert or update on public.trips
deferrable initially deferred
for each row execute function private.assert_trip_has_one_owner();

create constraint trigger trip_members_require_one_owner
after insert or update or delete on public.trip_members
deferrable initially deferred
for each row execute function private.assert_trip_has_one_owner();

comment on schema private is
  'Security-definer helpers and trigger functions that are not exposed as product APIs.';
comment on table public.trip_members is
  'The membership table is the group for a trip; there is no reusable groups table.';
comment on column public.trip_members.archived_at is
  'Per-user archive preference. It never archives the trip for other members.';
comment on column public.trip_invites.token_hash is
  'Lowercase SHA-256 hash. The plaintext invitation token is never persisted.';
comment on column public.activities.activity_date is
  'Local calendar date interpreted together with timezone and local time columns.';
comment on column public.photos.storage_path is
  'Private Storage object path. Public or signed URLs must never be persisted.';
