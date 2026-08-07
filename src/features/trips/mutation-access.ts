import "server-only";

import type { TripRole } from "@/features/trips/permissions";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type TripMutationAccess = {
  endDate: string;
  role: TripRole;
  startDate: string;
  status: Enums<"trip_status">;
};

export async function getTripMutationAccess(
  supabase: SupabaseClient,
  userId: string,
  tripId: string,
): Promise<TripMutationAccess | null> {
  const [tripResult, membershipResult] = await Promise.all([
    supabase
      .from("trips")
      .select("end_date, start_date, status")
      .eq("id", tripId)
      .maybeSingle(),
    supabase
      .from("trip_members")
      .select("role")
      .eq("trip_id", tripId)
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (!tripResult.data || !membershipResult.data) return null;
  return {
    endDate: tripResult.data.end_date,
    role: membershipResult.data.role,
    startDate: tripResult.data.start_date,
    status: tripResult.data.status,
  };
}

export function tripAcceptsContentWrites(
  status: Enums<"trip_status"> | undefined,
) {
  return status !== undefined && status !== "completed";
}
