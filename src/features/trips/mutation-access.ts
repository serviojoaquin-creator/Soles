import "server-only";

import type { TripRole } from "@/features/trips/permissions";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type TripMutationAccess = {
  allowCompletedEdits: boolean;
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
      .select("allow_completed_edits, end_date, start_date, status")
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
    allowCompletedEdits: tripResult.data.allow_completed_edits,
    endDate: tripResult.data.end_date,
    role: membershipResult.data.role,
    startDate: tripResult.data.start_date,
    status: tripResult.data.status,
  };
}

export function tripAcceptsContentWrites(
  access: Pick<TripMutationAccess, "allowCompletedEdits" | "status"> | null | undefined,
) {
  return (
    access !== null &&
    access !== undefined &&
    (access.status !== "completed" || access.allowCompletedEdits)
  );
}
