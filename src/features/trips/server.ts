import "server-only";

import { getCurrentUser } from "@/features/auth/server";
import type { TripRole } from "@/features/trips/permissions";
import {
  dashboardCategory,
  type DashboardCategory,
  type TripRow,
} from "@/features/trips/presentation";
import { createClient } from "@/lib/supabase/server";

export const TRIP_COVERS_BUCKET = "trip-covers";

type MembershipWithTrip = {
  archived_at: string | null;
  role: TripRole;
  trips: TripRow;
};

export type DashboardTrip = {
  archivedAt: string | null;
  category: DashboardCategory;
  coverUrl: string | null;
  role: TripRole;
  trip: TripRow;
};

export async function getDashboardTrips(): Promise<DashboardTrip[]> {
  const user = await getCurrentUser();
  if (!user) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trip_members")
    .select("archived_at, role, trips!inner(*)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  if (error) {
    throw new Error("Unable to load the trip dashboard.");
  }

  const memberships = (data ?? []) as unknown as MembershipWithTrip[];

  return Promise.all(
    memberships.map(async ({ archived_at: archivedAt, role, trips: trip }) => {
      let coverUrl: string | null = null;

      if (trip.cover_path) {
        const { data: signedCover } = await supabase.storage
          .from(TRIP_COVERS_BUCKET)
          .createSignedUrl(trip.cover_path, 300);
        coverUrl = signedCover?.signedUrl ?? null;
      }

      return {
        archivedAt,
        category: dashboardCategory(trip, archivedAt),
        coverUrl,
        role,
        trip,
      };
    }),
  );
}

export type TripContext = {
  archivedAt: string | null;
  coverUrl: string | null;
  memberCount: number;
  role: TripRole;
  trip: TripRow;
};

export async function getTripContext(
  tripId: string,
): Promise<TripContext | null> {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const supabase = await createClient();
  const [tripResult, membershipResult, membersResult] = await Promise.all([
    supabase.from("trips").select("*").eq("id", tripId).maybeSingle(),
    supabase
      .from("trip_members")
      .select("archived_at, role")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("trip_members")
      .select("trip_id", { count: "exact", head: true })
      .eq("trip_id", tripId),
  ]);

  if (
    tripResult.error ||
    membershipResult.error ||
    !tripResult.data ||
    !membershipResult.data
  ) {
    return null;
  }

  let coverUrl: string | null = null;
  if (tripResult.data.cover_path) {
    const { data: signedCover } = await supabase.storage
      .from(TRIP_COVERS_BUCKET)
      .createSignedUrl(tripResult.data.cover_path, 300);
    coverUrl = signedCover?.signedUrl ?? null;
  }

  return {
    archivedAt: membershipResult.data.archived_at,
    coverUrl,
    memberCount: membersResult.count ?? 1,
    role: membershipResult.data.role,
    trip: tripResult.data,
  };
}
