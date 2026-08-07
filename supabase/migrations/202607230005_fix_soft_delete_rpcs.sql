-- Soles: make soft deletion atomic without requesting rows hidden by SELECT RLS.

create function public.soft_delete_comment(
  p_trip_id uuid,
  p_comment_id uuid
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
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select comment.author_id, member.role
  into v_author, v_role
  from public.comments as comment
  join public.trips as trip on trip.id = comment.trip_id
  join public.trip_members as member on member.trip_id = comment.trip_id
  where comment.id = p_comment_id
    and comment.trip_id = p_trip_id
    and comment.deleted_at is null
    and trip.deleted_at is null
    and member.user_id = v_actor
  for update of comment;

  if not found then
    return false;
  end if;

  if v_author <> v_actor and v_role not in ('owner', 'admin') then
    raise exception 'Comment cannot be moderated by this user'
      using errcode = '42501';
  end if;

  update public.comments
  set deleted_at = statement_timestamp()
  where id = p_comment_id and trip_id = p_trip_id;

  return true;
end;
$$;

create function public.soft_delete_photo(
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
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select photo.uploaded_by, member.role, trip.status
  into v_uploader, v_role, v_status
  from public.photos as photo
  join public.trips as trip on trip.id = photo.trip_id
  join public.trip_members as member on member.trip_id = photo.trip_id
  where photo.id = p_photo_id
    and photo.trip_id = p_trip_id
    and photo.deleted_at is null
    and trip.deleted_at is null
    and member.user_id = v_actor
  for update of photo;

  if not found then
    return false;
  end if;

  if v_status = 'completed' then
    raise exception 'Completed trip photos are read-only'
      using errcode = '42501';
  end if;

  if v_uploader <> v_actor and v_role not in ('owner', 'admin') then
    raise exception 'Photo cannot be moderated by this user'
      using errcode = '42501';
  end if;

  update public.photos
  set deleted_at = statement_timestamp()
  where id = p_photo_id and trip_id = p_trip_id;

  return true;
end;
$$;

create function public.soft_delete_activity(
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
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select activity.created_by, member.role, trip.status
  into v_author, v_role, v_status
  from public.activities as activity
  join public.trips as trip on trip.id = activity.trip_id
  join public.trip_members as member on member.trip_id = activity.trip_id
  where activity.id = p_activity_id
    and activity.trip_id = p_trip_id
    and activity.deleted_at is null
    and trip.deleted_at is null
    and member.user_id = v_actor
  for update of activity;

  if not found then
    return false;
  end if;

  if v_status = 'completed' then
    raise exception 'Completed trip activities are read-only'
      using errcode = '42501';
  end if;

  if v_author <> v_actor and v_role not in ('owner', 'admin') then
    raise exception 'Activity cannot be moderated by this user'
      using errcode = '42501';
  end if;

  update public.activities
  set deleted_at = statement_timestamp()
  where id = p_activity_id and trip_id = p_trip_id;

  return true;
end;
$$;

revoke execute on function public.soft_delete_comment(uuid, uuid)
  from public, anon;
revoke execute on function public.soft_delete_photo(uuid, uuid)
  from public, anon;
revoke execute on function public.soft_delete_activity(uuid, uuid)
  from public, anon;

grant execute on function public.soft_delete_comment(uuid, uuid)
  to authenticated;
grant execute on function public.soft_delete_photo(uuid, uuid)
  to authenticated;
grant execute on function public.soft_delete_activity(uuid, uuid)
  to authenticated;

comment on function public.soft_delete_comment(uuid, uuid) is
  'Atomically soft-deletes a comment after checking membership and moderation rights.';
comment on function public.soft_delete_photo(uuid, uuid) is
  'Atomically soft-deletes an editable-trip photo after checking membership and moderation rights.';
comment on function public.soft_delete_activity(uuid, uuid) is
  'Atomically soft-deletes an editable-trip activity after checking membership and moderation rights.';
