import "server-only";

import { TRIP_PHOTOS_BUCKET } from "@/features/album/config";
import { getCurrentUser } from "@/features/auth/server";
import {
  sortActivities,
  type ActivityRow,
} from "@/features/itinerary/presentation";
import {
  getTripPeopleContext,
  type TripMemberView,
} from "@/features/members/server";
import { getTripContext, type TripContext } from "@/features/trips/server";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type MemoryPhoto = Tables<"photos"> & { signedUrl: string };

export type MemoryContext = TripContext & {
  activities: ActivityRow[];
  members: TripMemberView[];
  photos: MemoryPhoto[];
};

export async function getMemoryContext(
  tripId: string,
): Promise<MemoryContext | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const [tripContext, peopleContext] = await Promise.all([
    getTripContext(tripId),
    getTripPeopleContext(tripId),
  ]);
  if (
    !tripContext ||
    !peopleContext ||
    tripContext.trip.status !== "completed"
  ) {
    return null;
  }

  const supabase = await createClient();
  const [activitiesResult, photosResult] = await Promise.all([
    supabase
      .from("activities")
      .select("*")
      .eq("trip_id", tripId)
      .is("deleted_at", null)
      .order("activity_date")
      .order("start_time", { ascending: true, nullsFirst: false })
      .order("position"),
    supabase
      .from("photos")
      .select("*")
      .eq("trip_id", tripId)
      .is("deleted_at", null)
      .order("taken_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
  ]);
  if (activitiesResult.error || photosResult.error) {
    throw new Error("Unable to load the trip memory.");
  }

  const photos = await Promise.all(
    (photosResult.data ?? []).map(async (photo) => {
      const { data } = await supabase.storage
        .from(TRIP_PHOTOS_BUCKET)
        .createSignedUrl(photo.storage_path, 300);
      return data?.signedUrl ? { ...photo, signedUrl: data.signedUrl } : null;
    }),
  );

  return {
    ...tripContext,
    activities: sortActivities(activitiesResult.data ?? []),
    members: peopleContext.members,
    photos: photos.filter((photo): photo is MemoryPhoto => photo !== null),
  };
}
