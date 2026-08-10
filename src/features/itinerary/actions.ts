"use server";

import { revalidatePath } from "next/cache";
import type { Route } from "next";
import { redirect } from "next/navigation";

import { canEditActivity } from "@/features/itinerary/permissions";
import type { ActivityRow } from "@/features/itinerary/presentation";
import {
  activitySchema,
  activityStatusSchema,
  deleteActivitySchema,
  isActivityOutsideTrip,
  itineraryFormValue,
  reorderActivitySchema,
  updateActivitySchema,
} from "@/features/itinerary/schemas";
import type { TripRole } from "@/features/trips/permissions";
import {
  getTripMutationAccess,
  tripAcceptsContentWrites,
} from "@/features/trips/mutation-access";
import { tripIdSchema } from "@/features/trips/schemas";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function itineraryPath(
  tripId: string,
  kind: "error" | "message",
  code: string,
): Route {
  return `/trips/${tripId}/itinerary?${kind}=${encodeURIComponent(code)}` as Route;
}

async function authenticatedActor() {
  if (!hasSupabaseConfig()) {
    redirect("/login?error=configuration");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?error=session_expired");
  return { supabase, user };
}

async function tripMembership(
  supabase: SupabaseClient,
  userId: string,
  tripId: string,
) {
  return getTripMutationAccess(supabase, userId, tripId);
}

async function activityForMutation(
  supabase: SupabaseClient,
  tripId: string,
  activityId: string,
) {
  const { data } = await supabase
    .from("activities")
    .select("*")
    .eq("id", activityId)
    .eq("trip_id", tripId)
    .maybeSingle();
  return data as ActivityRow | null;
}

function activityInput(formData: FormData) {
  return {
    activityDate: itineraryFormValue(formData, "activityDate"),
    confirmOutsideRange: itineraryFormValue(formData, "confirmOutsideRange"),
    description: itineraryFormValue(formData, "description"),
    endTime: itineraryFormValue(formData, "endTime"),
    locationName: itineraryFormValue(formData, "locationName"),
    startTime: itineraryFormValue(formData, "startTime"),
    timezone: itineraryFormValue(formData, "timezone"),
    title: itineraryFormValue(formData, "title"),
    tripId: itineraryFormValue(formData, "tripId"),
  };
}

function mutationAllowed(
  role: TripRole,
  currentUserId: string,
  activity: ActivityRow,
) {
  return canEditActivity(role, currentUserId, activity.created_by);
}

function revalidateItinerary(tripId: string) {
  revalidatePath(`/trips/${tripId}`);
  revalidatePath(`/trips/${tripId}/itinerary`);
}

export async function createActivityAction(formData: FormData) {
  const parsed = activitySchema.safeParse(activityInput(formData));
  const fallbackTripId = itineraryFormValue(formData, "tripId");
  if (!parsed.success) {
    redirect(
      tripIdSchema.safeParse(fallbackTripId).success
        ? itineraryPath(fallbackTripId, "error", "activity_invalid")
        : "/dashboard?error=activity_invalid",
    );
  }

  const { supabase, user } = await authenticatedActor();
  const membership = await tripMembership(
    supabase,
    user.id,
    parsed.data.tripId,
  );
  if (!membership) {
    redirect(itineraryPath(parsed.data.tripId, "error", "activity_forbidden"));
  }
  if (!tripAcceptsContentWrites(membership)) {
    redirect(itineraryPath(parsed.data.tripId, "error", "activity_read_only"));
  }

  if (
    isActivityOutsideTrip(
      parsed.data.activityDate,
      membership.startDate,
      membership.endDate,
    ) &&
    parsed.data.confirmOutsideRange !== "yes"
  ) {
    redirect(
      itineraryPath(parsed.data.tripId, "error", "activity_outside_range"),
    );
  }

  let positionQuery = supabase
    .from("activities")
    .select("position")
    .eq("trip_id", parsed.data.tripId)
    .eq("activity_date", parsed.data.activityDate)
    .order("position", { ascending: false })
    .limit(1);
  positionQuery = parsed.data.startTime
    ? positionQuery.eq("start_time", parsed.data.startTime)
    : positionQuery.is("start_time", null);
  const { data: positions, error: positionError } = await positionQuery;
  if (positionError) {
    console.error("[itinerary:create] position lookup failed", {
      code: positionError.code,
      details: positionError.details,
      hint: positionError.hint,
      message: positionError.message,
    });
    redirect(
      itineraryPath(parsed.data.tripId, "error", "activity_unavailable"),
    );
  }
  const nextPosition = (positions?.[0]?.position ?? 0) + 1000;

  const { data, error } = await supabase
    .from("activities")
    .insert({
      activity_date: parsed.data.activityDate,
      created_by: user.id,
      description: parsed.data.description || null,
      end_time: parsed.data.endTime || null,
      location_name: parsed.data.locationName || null,
      position: nextPosition,
      start_time: parsed.data.startTime || null,
      timezone: parsed.data.timezone,
      title: parsed.data.title,
      trip_id: parsed.data.tripId,
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("[itinerary:create] insert failed", {
      code: error?.code ?? "missing_data",
      details: error?.details ?? null,
      hint: error?.hint ?? null,
      message: error?.message ?? "Insert returned no activity",
    });
    redirect(
      itineraryPath(parsed.data.tripId, "error", "activity_unavailable"),
    );
  }

  revalidateItinerary(parsed.data.tripId);
  redirect(itineraryPath(parsed.data.tripId, "message", "activity_created"));
}

export async function updateActivityAction(formData: FormData) {
  const parsed = updateActivitySchema.safeParse({
    ...activityInput(formData),
    activityId: itineraryFormValue(formData, "activityId"),
  });
  const fallbackTripId = itineraryFormValue(formData, "tripId");
  if (!parsed.success) {
    redirect(
      tripIdSchema.safeParse(fallbackTripId).success
        ? itineraryPath(fallbackTripId, "error", "activity_invalid")
        : "/dashboard?error=activity_invalid",
    );
  }

  const { supabase, user } = await authenticatedActor();
  const [membership, activity] = await Promise.all([
    tripMembership(supabase, user.id, parsed.data.tripId),
    activityForMutation(supabase, parsed.data.tripId, parsed.data.activityId),
  ]);
  if (!membership || !activity) {
    redirect(itineraryPath(parsed.data.tripId, "error", "activity_forbidden"));
  }
  if (!tripAcceptsContentWrites(membership)) {
    redirect(itineraryPath(parsed.data.tripId, "error", "activity_read_only"));
  }
  if (!mutationAllowed(membership.role, user.id, activity)) {
    redirect(itineraryPath(parsed.data.tripId, "error", "activity_forbidden"));
  }

  if (
    isActivityOutsideTrip(
      parsed.data.activityDate,
      membership.startDate,
      membership.endDate,
    ) &&
    parsed.data.confirmOutsideRange !== "yes"
  ) {
    redirect(
      itineraryPath(parsed.data.tripId, "error", "activity_outside_range"),
    );
  }

  const { data, error } = await supabase
    .from("activities")
    .update({
      activity_date: parsed.data.activityDate,
      description: parsed.data.description || null,
      end_time: parsed.data.endTime || null,
      location_name: parsed.data.locationName || null,
      start_time: parsed.data.startTime || null,
      timezone: parsed.data.timezone,
      title: parsed.data.title,
    })
    .eq("id", parsed.data.activityId)
    .eq("trip_id", parsed.data.tripId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    redirect(
      itineraryPath(parsed.data.tripId, "error", "activity_unavailable"),
    );
  }
  revalidateItinerary(parsed.data.tripId);
  redirect(itineraryPath(parsed.data.tripId, "message", "activity_updated"));
}

export async function updateActivityStatusAction(formData: FormData) {
  const parsed = activityStatusSchema.safeParse({
    activityId: itineraryFormValue(formData, "activityId"),
    status: itineraryFormValue(formData, "status"),
    tripId: itineraryFormValue(formData, "tripId"),
  });
  if (!parsed.success) redirect("/dashboard?error=activity_invalid");

  const { supabase, user } = await authenticatedActor();
  const [membership, activity] = await Promise.all([
    tripMembership(supabase, user.id, parsed.data.tripId),
    activityForMutation(supabase, parsed.data.tripId, parsed.data.activityId),
  ]);
  if (!membership || !activity) {
    redirect(itineraryPath(parsed.data.tripId, "error", "activity_forbidden"));
  }
  if (!tripAcceptsContentWrites(membership)) {
    redirect(itineraryPath(parsed.data.tripId, "error", "activity_read_only"));
  }
  if (!mutationAllowed(membership.role, user.id, activity)) {
    redirect(itineraryPath(parsed.data.tripId, "error", "activity_forbidden"));
  }

  const { data, error } = await supabase
    .from("activities")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.activityId)
    .eq("trip_id", parsed.data.tripId)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    redirect(
      itineraryPath(parsed.data.tripId, "error", "activity_unavailable"),
    );
  }
  revalidateItinerary(parsed.data.tripId);
  redirect(
    itineraryPath(parsed.data.tripId, "message", "activity_status_updated"),
  );
}

export async function deleteActivityAction(formData: FormData) {
  const parsed = deleteActivitySchema.safeParse({
    activityId: itineraryFormValue(formData, "activityId"),
    confirm: itineraryFormValue(formData, "confirm"),
    tripId: itineraryFormValue(formData, "tripId"),
  });
  if (!parsed.success) redirect("/dashboard?error=activity_invalid");

  const { supabase, user } = await authenticatedActor();
  const [membership, activity] = await Promise.all([
    tripMembership(supabase, user.id, parsed.data.tripId),
    activityForMutation(supabase, parsed.data.tripId, parsed.data.activityId),
  ]);
  if (!membership || !activity) {
    redirect(itineraryPath(parsed.data.tripId, "error", "activity_forbidden"));
  }
  if (!tripAcceptsContentWrites(membership)) {
    redirect(itineraryPath(parsed.data.tripId, "error", "activity_read_only"));
  }
  if (!mutationAllowed(membership.role, user.id, activity)) {
    redirect(itineraryPath(parsed.data.tripId, "error", "activity_forbidden"));
  }

  const { data: deleted, error } = await supabase.rpc("soft_delete_activity", {
    p_activity_id: parsed.data.activityId,
    p_trip_id: parsed.data.tripId,
  });
  if (error || !deleted) {
    console.error(
      `[itinerary:activity-delete] soft delete failed: ${error?.code ?? "no-code"} ${error?.message ?? "no row changed"}; details=${error?.details ?? "none"}; hint=${error?.hint ?? "none"}`,
    );
    redirect(
      itineraryPath(parsed.data.tripId, "error", "activity_unavailable"),
    );
  }
  revalidateItinerary(parsed.data.tripId);
  redirect(itineraryPath(parsed.data.tripId, "message", "activity_deleted"));
}

export async function reorderActivityAction(formData: FormData) {
  const parsed = reorderActivitySchema.safeParse({
    activityId: itineraryFormValue(formData, "activityId"),
    direction: itineraryFormValue(formData, "direction"),
    tripId: itineraryFormValue(formData, "tripId"),
  });
  if (!parsed.success) redirect("/dashboard?error=activity_invalid");

  const { supabase, user } = await authenticatedActor();
  const [membership, activity] = await Promise.all([
    tripMembership(supabase, user.id, parsed.data.tripId),
    activityForMutation(supabase, parsed.data.tripId, parsed.data.activityId),
  ]);
  if (!membership || !activity) {
    redirect(itineraryPath(parsed.data.tripId, "error", "activity_forbidden"));
  }
  if (!tripAcceptsContentWrites(membership)) {
    redirect(itineraryPath(parsed.data.tripId, "error", "activity_read_only"));
  }
  if (!mutationAllowed(membership.role, user.id, activity)) {
    redirect(itineraryPath(parsed.data.tripId, "error", "activity_forbidden"));
  }

  let siblingsQuery = supabase
    .from("activities")
    .select("id, position, created_at")
    .eq("trip_id", parsed.data.tripId)
    .eq("activity_date", activity.activity_date)
    .order("position")
    .order("created_at");
  siblingsQuery = activity.start_time
    ? siblingsQuery.eq("start_time", activity.start_time)
    : siblingsQuery.is("start_time", null);
  const { data: siblings, error: siblingError } = await siblingsQuery;
  const index = siblings?.findIndex((item) => item.id === activity.id) ?? -1;
  const neighborIndex = parsed.data.direction === "up" ? index - 1 : index + 1;
  const neighbor = siblings?.[neighborIndex];

  if (siblingError || index < 0) {
    redirect(
      itineraryPath(parsed.data.tripId, "error", "activity_unavailable"),
    );
  }
  if (
    !neighbor ||
    (parsed.data.direction === "up" && neighbor.position === 0)
  ) {
    redirect(
      itineraryPath(parsed.data.tripId, "message", "activity_order_unchanged"),
    );
  }

  const position =
    parsed.data.direction === "up"
      ? neighbor.position - 1
      : neighbor.position + 1;
  const { data, error } = await supabase
    .from("activities")
    .update({ position })
    .eq("id", parsed.data.activityId)
    .eq("trip_id", parsed.data.tripId)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    redirect(
      itineraryPath(parsed.data.tripId, "error", "activity_unavailable"),
    );
  }
  revalidateItinerary(parsed.data.tripId);
  redirect(itineraryPath(parsed.data.tripId, "message", "activity_reordered"));
}
