import "server-only";

import {
  getActivityComments,
  type AlbumComment,
} from "@/features/album/server";
import { getCurrentUser } from "@/features/auth/server";
import {
  sortActivities,
  type ActivityRow,
} from "@/features/itinerary/presentation";
import { getTripContext, type TripContext } from "@/features/trips/server";
import { createClient } from "@/lib/supabase/server";

export type ItineraryContext = TripContext & {
  activities: ActivityRow[];
  commentsByActivity: Map<string, AlbumComment[]>;
  currentUserId: string;
};

export async function getItineraryContext(
  tripId: string,
): Promise<ItineraryContext | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const tripContext = await getTripContext(tripId);
  if (!tripContext) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("trip_id", tripId)
    .order("activity_date")
    .order("start_time", { ascending: true, nullsFirst: false })
    .order("position")
    .order("created_at");

  if (error) {
    throw new Error("Unable to load the itinerary.");
  }

  const activities = sortActivities(data ?? []);
  const commentsByActivity = await getActivityComments(
    tripId,
    activities.map((activity) => activity.id),
  );

  return {
    ...tripContext,
    activities,
    commentsByActivity,
    currentUserId: user.id,
  };
}
