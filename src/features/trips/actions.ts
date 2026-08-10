"use server";

import { revalidatePath } from "next/cache";
import type { Route } from "next";
import { redirect } from "next/navigation";

import {
  canActivateTrip,
  canDeleteTrip,
  canEditTrip,
  canFinalizeTrip,
  canReopenTrip,
} from "@/features/trips/permissions";
import {
  getTripMutationAccess,
  tripAcceptsContentWrites,
} from "@/features/trips/mutation-access";
import {
  archiveTripSchema,
  completedEditingTripSchema,
  lifecycleTripSchema,
  tripFormValue,
  tripIdSchema,
  tripSchema,
} from "@/features/trips/schemas";
import { TRIP_COVERS_BUCKET } from "@/features/trips/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const MAX_COVER_BYTES = 2 * 1024 * 1024;
const coverTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function feedbackPath(
  path: string,
  kind: "error" | "message",
  code: string,
): Route {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${kind}=${encodeURIComponent(code)}` as Route;
}

async function authenticatedClient() {
  if (!hasSupabaseConfig()) {
    redirect("/login?error=configuration");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?error=session_expired");
  }

  return { supabase, user };
}

function hasValidSignature(bytes: Uint8Array, type: keyof typeof coverTypes) {
  if (type === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (type === "image/png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }

  return (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

type PreparedCover = {
  extension: (typeof coverTypes)[keyof typeof coverTypes];
  file: File;
};

async function prepareCover(value: FormDataEntryValue | null) {
  if (!(value instanceof File) || value.size === 0) {
    return { cover: null, valid: true } as const;
  }

  const extension = coverTypes[value.type as keyof typeof coverTypes];
  if (!extension || value.size > MAX_COVER_BYTES) {
    return { cover: null, valid: false } as const;
  }

  const bytes = new Uint8Array(await value.slice(0, 12).arrayBuffer());
  if (!hasValidSignature(bytes, value.type as keyof typeof coverTypes)) {
    return { cover: null, valid: false } as const;
  }

  return {
    cover: { extension, file: value } satisfies PreparedCover,
    valid: true,
  } as const;
}

async function storeCover(
  supabase: SupabaseClient,
  tripId: string,
  cover: PreparedCover,
  previousPath: string | null,
) {
  const objectPath = `${tripId}/cover-${crypto.randomUUID()}.${cover.extension}`;
  const { error: uploadError } = await supabase.storage
    .from(TRIP_COVERS_BUCKET)
    .upload(objectPath, cover.file, {
      cacheControl: "3600",
      contentType: cover.file.type,
      upsert: false,
    });

  if (uploadError) {
    return false;
  }

  const { data: updatedTrip, error: updateError } = await supabase
    .from("trips")
    .update({ cover_path: objectPath })
    .eq("id", tripId)
    .select("id")
    .maybeSingle();

  if (updateError || !updatedTrip) {
    await supabase.storage.from(TRIP_COVERS_BUCKET).remove([objectPath]);
    return false;
  }

  if (previousPath) {
    await supabase.storage.from(TRIP_COVERS_BUCKET).remove([previousPath]);
  }

  return true;
}

function tripInput(formData: FormData) {
  return {
    name: tripFormValue(formData, "name"),
    description: tripFormValue(formData, "description"),
    destination: tripFormValue(formData, "destination"),
    startDate: tripFormValue(formData, "startDate"),
    endDate: tripFormValue(formData, "endDate"),
    defaultTimezone: tripFormValue(formData, "defaultTimezone"),
  };
}

export async function createTripAction(formData: FormData) {
  const parsed = tripSchema.safeParse(tripInput(formData));
  const preparedCover = await prepareCover(formData.get("cover"));

  if (!parsed.success) {
    redirect("/trips/new?error=invalid_trip");
  }
  if (!preparedCover.valid) {
    redirect("/trips/new?error=cover_invalid");
  }

  const { supabase } = await authenticatedClient();
  const { data: trip, error } = await supabase.rpc("create_trip", {
    p_name: parsed.data.name,
    p_description: parsed.data.description || null,
    p_destination: parsed.data.destination,
    p_start_date: parsed.data.startDate,
    p_end_date: parsed.data.endDate,
    p_default_timezone: parsed.data.defaultTimezone,
    p_cover_path: null,
  });

  if (error || !trip) {
    redirect("/trips/new?error=unavailable");
  }

  if (preparedCover.cover) {
    const stored = await storeCover(
      supabase,
      trip.id,
      preparedCover.cover,
      null,
    );
    if (!stored) {
      revalidatePath("/dashboard");
      redirect(
        feedbackPath(
          `/trips/${trip.id}`,
          "message",
          "trip_created_cover_failed",
        ),
      );
    }
  }

  revalidatePath("/dashboard");
  redirect(feedbackPath(`/trips/${trip.id}`, "message", "trip_created"));
}

export async function updateTripAction(formData: FormData) {
  const tripId = tripFormValue(formData, "tripId");
  const parsedId = tripIdSchema.safeParse(tripId);
  const parsed = tripSchema.safeParse(tripInput(formData));
  const fallback = parsedId.success
    ? `/trips/${tripId}/settings`
    : "/dashboard";

  if (!parsedId.success || !parsed.success) {
    redirect(feedbackPath(fallback, "error", "invalid_trip"));
  }

  const { supabase, user } = await authenticatedClient();
  const access = await getTripMutationAccess(supabase, user.id, tripId);
  if (!access || !canEditTrip(access.role)) {
    redirect(feedbackPath(fallback, "error", "forbidden"));
  }
  if (!tripAcceptsContentWrites(access)) {
    redirect(feedbackPath(fallback, "error", "trip_completed_read_only"));
  }

  const { data: updatedTrip, error } = await supabase
    .from("trips")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
      destination: parsed.data.destination,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate,
      default_timezone: parsed.data.defaultTimezone,
    })
    .eq("id", tripId)
    .select("id")
    .maybeSingle();

  if (error || !updatedTrip) {
    redirect(feedbackPath(fallback, "error", "unavailable"));
  }

  revalidatePath("/dashboard");
  revalidatePath(`/trips/${tripId}`);
  redirect(feedbackPath(fallback, "message", "trip_updated"));
}

export async function activateTripAction(formData: FormData) {
  const tripId = tripFormValue(formData, "tripId");
  const parsedId = tripIdSchema.safeParse(tripId);
  const fallback = parsedId.success
    ? `/trips/${tripId}/settings`
    : "/dashboard";

  if (!parsedId.success) {
    redirect(feedbackPath(fallback, "error", "invalid_trip"));
  }

  const { supabase, user } = await authenticatedClient();
  const access = await getTripMutationAccess(supabase, user.id, tripId);
  if (!access || !canActivateTrip(access.role)) {
    redirect(feedbackPath(fallback, "error", "forbidden"));
  }
  if (access.status !== "planning") {
    redirect(feedbackPath(fallback, "error", "lifecycle_invalid"));
  }

  const { error } = await supabase.rpc("set_trip_status", {
    p_trip_id: tripId,
    p_status: "active",
  });

  if (error) {
    redirect(feedbackPath(fallback, "error", "unavailable"));
  }

  revalidatePath("/dashboard");
  revalidatePath(`/trips/${tripId}`);
  redirect(feedbackPath(fallback, "message", "trip_activated"));
}

function revalidateTripLifecycle(tripId: string) {
  revalidatePath("/dashboard");
  revalidatePath(`/trips/${tripId}`);
  revalidatePath(`/trips/${tripId}/album`);
  revalidatePath(`/trips/${tripId}/itinerary`);
  revalidatePath(`/trips/${tripId}/memory`);
  revalidatePath(`/trips/${tripId}/people`);
  revalidatePath(`/trips/${tripId}/settings`);
}

export async function finalizeTripAction(formData: FormData) {
  const parsed = lifecycleTripSchema.safeParse({
    confirm: tripFormValue(formData, "confirm"),
    tripId: tripFormValue(formData, "tripId"),
  });
  if (!parsed.success) redirect("/dashboard?error=invalid_trip");

  const { supabase, user } = await authenticatedClient();
  const access = await getTripMutationAccess(
    supabase,
    user.id,
    parsed.data.tripId,
  );
  if (!access || !canFinalizeTrip(access.role)) {
    redirect(
      feedbackPath(
        `/trips/${parsed.data.tripId}/settings`,
        "error",
        "forbidden",
      ),
    );
  }
  if (access.status === "completed") {
    redirect(`/trips/${parsed.data.tripId}/memory` as Route);
  }

  const { data, error } = await supabase.rpc("set_trip_status", {
    p_trip_id: parsed.data.tripId,
    p_status: "completed",
  });
  if (error || !data?.completed_at || data.status !== "completed") {
    redirect(
      feedbackPath(
        `/trips/${parsed.data.tripId}/settings`,
        "error",
        "unavailable",
      ),
    );
  }

  revalidateTripLifecycle(parsed.data.tripId);
  redirect(
    feedbackPath(
      `/trips/${parsed.data.tripId}/memory`,
      "message",
      "trip_completed",
    ),
  );
}

export async function reopenTripAction(formData: FormData) {
  const parsed = lifecycleTripSchema.safeParse({
    confirm: tripFormValue(formData, "confirm"),
    tripId: tripFormValue(formData, "tripId"),
  });
  if (!parsed.success) redirect("/dashboard?error=invalid_trip");

  const { supabase, user } = await authenticatedClient();
  const access = await getTripMutationAccess(
    supabase,
    user.id,
    parsed.data.tripId,
  );
  if (!access || !canReopenTrip(access.role)) {
    redirect(
      feedbackPath(`/trips/${parsed.data.tripId}/memory`, "error", "forbidden"),
    );
  }
  if (access.status !== "completed") {
    redirect(`/trips/${parsed.data.tripId}` as Route);
  }

  const { data, error } = await supabase.rpc("set_trip_status", {
    p_trip_id: parsed.data.tripId,
    p_status: "active",
  });
  if (
    error ||
    !data ||
    data.completed_at !== null ||
    data.status !== "active"
  ) {
    redirect(
      feedbackPath(
        `/trips/${parsed.data.tripId}/memory`,
        "error",
        "unavailable",
      ),
    );
  }

  revalidateTripLifecycle(parsed.data.tripId);
  redirect(
    feedbackPath(`/trips/${parsed.data.tripId}`, "message", "trip_reopened"),
  );
}

export async function setTripCompletedEditingAction(formData: FormData) {
  const parsed = completedEditingTripSchema.safeParse({
    allowEdits: tripFormValue(formData, "allowEdits"),
    confirm: tripFormValue(formData, "confirm"),
    tripId: tripFormValue(formData, "tripId"),
  });
  if (!parsed.success) redirect("/dashboard?error=invalid_trip");

  const { supabase, user } = await authenticatedClient();
  const access = await getTripMutationAccess(
    supabase,
    user.id,
    parsed.data.tripId,
  );
  if (!access || !canReopenTrip(access.role) || access.status !== "completed") {
    redirect(
      feedbackPath(`/trips/${parsed.data.tripId}/memory`, "error", "forbidden"),
    );
  }

  const allowEdits = parsed.data.allowEdits === "true";
  if (access.allowCompletedEdits === allowEdits) {
    redirect(`/trips/${parsed.data.tripId}/settings` as Route);
  }

  const { data, error } = await supabase.rpc("set_trip_completed_editing", {
    p_allow_edits: allowEdits,
    p_trip_id: parsed.data.tripId,
  });
  if (error || !data || data.allow_completed_edits !== allowEdits) {
    redirect(
      feedbackPath(
        `/trips/${parsed.data.tripId}/settings`,
        "error",
        "unavailable",
      ),
    );
  }

  revalidateTripLifecycle(parsed.data.tripId);
  redirect(
    feedbackPath(
      `/trips/${parsed.data.tripId}/settings`,
      "message",
      allowEdits ? "trip_completed_editing_enabled" : "trip_completed_editing_disabled",
    ),
  );
}

export async function deleteTripAction(formData: FormData) {
  const parsed = lifecycleTripSchema.safeParse({
    confirm: tripFormValue(formData, "confirm"),
    tripId: tripFormValue(formData, "tripId"),
  });
  if (!parsed.success) redirect("/dashboard?error=invalid_trip");

  const { supabase, user } = await authenticatedClient();
  const access = await getTripMutationAccess(
    supabase,
    user.id,
    parsed.data.tripId,
  );
  if (!access || !canDeleteTrip(access.role)) {
    redirect(
      feedbackPath(
        `/trips/${parsed.data.tripId}/settings`,
        "error",
        "forbidden",
      ),
    );
  }
  if (access.status === "completed") {
    redirect(
      feedbackPath(
        `/trips/${parsed.data.tripId}/settings`,
        "error",
        "trip_completed_read_only",
      ),
    );
  }

  const { data, error } = await supabase.rpc("set_trip_deleted", {
    p_deleted: true,
    p_trip_id: parsed.data.tripId,
  });
  if (error || !data?.deleted_at) {
    redirect(
      feedbackPath(
        `/trips/${parsed.data.tripId}/settings`,
        "error",
        "unavailable",
      ),
    );
  }

  revalidateTripLifecycle(parsed.data.tripId);
  redirect(feedbackPath("/dashboard", "message", "trip_deleted"));
}

export async function archiveTripAction(formData: FormData) {
  const parsed = archiveTripSchema.safeParse({
    tripId: tripFormValue(formData, "tripId"),
    archived: tripFormValue(formData, "archived"),
  });

  if (!parsed.success) {
    redirect("/dashboard?error=invalid_trip");
  }

  const { supabase, user } = await authenticatedClient();
  const shouldArchive = parsed.data.archived === "true";
  const { data, error } = await supabase
    .from("trip_members")
    .update({ archived_at: shouldArchive ? new Date().toISOString() : null })
    .eq("trip_id", parsed.data.tripId)
    .eq("user_id", user.id)
    .select("trip_id")
    .maybeSingle();

  if (error || !data) {
    redirect("/dashboard?error=unavailable");
  }

  revalidatePath("/dashboard");
  revalidatePath(`/trips/${parsed.data.tripId}`);
  redirect(
    feedbackPath(
      "/dashboard",
      "message",
      shouldArchive ? "archived" : "unarchived",
    ),
  );
}

export async function uploadTripCoverAction(formData: FormData) {
  const tripId = tripFormValue(formData, "tripId");
  const parsedId = tripIdSchema.safeParse(tripId);
  const fallback = parsedId.success
    ? `/trips/${tripId}/settings`
    : "/dashboard";
  const preparedCover = await prepareCover(formData.get("cover"));

  if (!parsedId.success || !preparedCover.valid || !preparedCover.cover) {
    redirect(feedbackPath(fallback, "error", "cover_invalid"));
  }

  const { supabase, user } = await authenticatedClient();
  const access = await getTripMutationAccess(supabase, user.id, tripId);
  if (!access || !canEditTrip(access.role)) {
    redirect(feedbackPath(fallback, "error", "forbidden"));
  }
  if (!tripAcceptsContentWrites(access)) {
    redirect(feedbackPath(fallback, "error", "trip_completed_read_only"));
  }

  const { data: trip } = await supabase
    .from("trips")
    .select("cover_path")
    .eq("id", tripId)
    .maybeSingle();
  const stored = await storeCover(
    supabase,
    tripId,
    preparedCover.cover,
    trip?.cover_path ?? null,
  );

  if (!stored) {
    redirect(feedbackPath(fallback, "error", "cover_failed"));
  }

  revalidatePath("/dashboard");
  revalidatePath(`/trips/${tripId}`);
  redirect(feedbackPath(fallback, "message", "cover_updated"));
}

export async function removeTripCoverAction(formData: FormData) {
  const tripId = tripFormValue(formData, "tripId");
  const parsedId = tripIdSchema.safeParse(tripId);
  const fallback = parsedId.success
    ? `/trips/${tripId}/settings`
    : "/dashboard";

  if (!parsedId.success) {
    redirect(feedbackPath(fallback, "error", "invalid_trip"));
  }

  const { supabase, user } = await authenticatedClient();
  const access = await getTripMutationAccess(supabase, user.id, tripId);
  if (!access || !canEditTrip(access.role)) {
    redirect(feedbackPath(fallback, "error", "forbidden"));
  }
  if (!tripAcceptsContentWrites(access)) {
    redirect(feedbackPath(fallback, "error", "trip_completed_read_only"));
  }

  const { data: trip } = await supabase
    .from("trips")
    .select("cover_path")
    .eq("id", tripId)
    .maybeSingle();

  if (!trip?.cover_path) {
    redirect(fallback as Route);
  }

  const { data: updatedTrip, error } = await supabase
    .from("trips")
    .update({ cover_path: null })
    .eq("id", tripId)
    .select("id")
    .maybeSingle();

  if (error || !updatedTrip) {
    redirect(feedbackPath(fallback, "error", "unavailable"));
  }

  await supabase.storage.from(TRIP_COVERS_BUCKET).remove([trip.cover_path]);
  revalidatePath("/dashboard");
  revalidatePath(`/trips/${tripId}`);
  redirect(feedbackPath(fallback, "message", "cover_removed"));
}
