-- Soles: completed memories start the day after the local return date.

create or replace function private.guard_trip_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_actor_role public.trip_role;
  v_context text := current_setting('soles.trip_write_context', true);
  v_elapsed_lifecycle boolean := v_context = format('elapsed-lifecycle:%s:%s', old.id, auth.uid());
  v_migration_backfill boolean := v_context = 'elapsed-lifecycle:system' and auth.uid() is null;
begin
  if new.id is distinct from old.id
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at then
    raise exception 'Trip identity, creator, and creation timestamp are immutable'
      using errcode = '42501';
  end if;

  v_actor_role := private.current_trip_role(old.id);
  if v_actor_role not in ('owner', 'admin') and not v_elapsed_lifecycle and not v_migration_backfill then
    raise exception 'Only trip owners and admins may update a trip'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status
    or new.completed_at is distinct from old.completed_at then
    if not v_elapsed_lifecycle
      and not v_migration_backfill
      and (v_actor_role <> 'owner'
        or v_context <> format('lifecycle:%s:%s', old.id, auth.uid())) then
      raise exception 'Trip lifecycle changes require the owner RPC'
        using errcode = '42501';
    end if;
  end if;

  if new.allow_completed_edits is distinct from old.allow_completed_edits then
    if not v_elapsed_lifecycle
      and not v_migration_backfill
      and (v_actor_role <> 'owner'
        or v_context <> format('completed-editing:%s:%s', old.id, auth.uid())) then
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
        and (
          v_context = format('completed-editing:%s:%s', old.id, auth.uid())
          or v_context = 'elapsed-lifecycle:system'
        ) then
        return new;
      end if;

      raise exception 'Completed trips must be unlocked or reopened before editing'
        using errcode = '42501';
    end if;
    return new;
  end if;

  v_trip_id := case when tg_op = 'DELETE' then old.trip_id else new.trip_id end;
  select status, allow_completed_edits into v_status, v_allow_completed_edits
  from public.trips where id = v_trip_id;

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

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.sync_elapsed_trip_lifecycle()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_trip_id uuid;
  v_updated_count integer := 0;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  for v_trip_id in
    select trip.id
    from public.trips as trip
    join public.trip_members as member on member.trip_id = trip.id
    where member.user_id = v_actor
      and trip.deleted_at is null
      and trip.status in ('planning', 'active')
      and trip.end_date < (statement_timestamp() at time zone trip.default_timezone)::date
    for update of trip
  loop
    perform set_config(
      'soles.trip_write_context',
      format('elapsed-lifecycle:%s:%s', v_trip_id, v_actor),
      true
    );

    update public.trips
    set status = 'completed',
        completed_at = coalesce(completed_at, statement_timestamp()),
        allow_completed_edits = true
    where id = v_trip_id;

    v_updated_count := v_updated_count + 1;
  end loop;

  perform set_config('soles.trip_write_context', '', true);
  return v_updated_count;
end;
$$;

select set_config('soles.trip_write_context', 'elapsed-lifecycle:system', true);

update public.trips as trip
set status = 'completed',
    completed_at = coalesce(completed_at, statement_timestamp()),
    allow_completed_edits = true
where trip.deleted_at is null
  and (
    (trip.status in ('planning', 'active')
      and trip.end_date < (statement_timestamp() at time zone trip.default_timezone)::date)
    or (trip.status = 'completed' and not trip.allow_completed_edits)
  );

select set_config('soles.trip_write_context', '', true);

revoke execute on function public.sync_elapsed_trip_lifecycle() from public, anon;
grant execute on function public.sync_elapsed_trip_lifecycle() to authenticated;

comment on function public.sync_elapsed_trip_lifecycle() is
  'Completes a signed-in member’s elapsed trips after their local return date.';
