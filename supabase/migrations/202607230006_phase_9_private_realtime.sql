-- Phase 9: private, trip-scoped Realtime invalidation for collaborative content.

create function private.broadcast_trip_content_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trip_id uuid := coalesce(new.trip_id, old.trip_id);
  v_record_id uuid := coalesce(new.id, old.id);
begin
  perform realtime.send(
    jsonb_build_object(
      'event_id', pg_catalog.gen_random_uuid(),
      'operation', tg_op,
      'record_id', v_record_id,
      'table', tg_table_name
    ),
    'trip_content_changed',
    'trip:' || v_trip_id::text,
    true
  );

  return null;
end;
$$;

create trigger activities_private_realtime
after insert or update or delete on public.activities
for each row execute function private.broadcast_trip_content_change();

create trigger photos_private_realtime
after insert or update or delete on public.photos
for each row execute function private.broadcast_trip_content_change();

create trigger comments_private_realtime
after insert or update or delete on public.comments
for each row execute function private.broadcast_trip_content_change();

create policy trip_members_receive_content_changes
on realtime.messages
for select
to authenticated
using (
  extension = 'broadcast'
  and case
    when realtime.topic() ~ '^trip:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then private.is_trip_member(split_part(realtime.topic(), ':', 2)::uuid)
    else false
  end
);

revoke all on function private.broadcast_trip_content_change()
from public, anon, authenticated;
