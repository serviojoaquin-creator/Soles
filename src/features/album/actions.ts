"use server";

import { revalidatePath } from "next/cache";
import type { Route } from "next";
import { redirect } from "next/navigation";

import { TRIP_PHOTOS_BUCKET } from "@/features/album/config";
import { canModerateOwnedContent } from "@/features/album/permissions";
import {
  createCommentSchema,
  deleteCommentSchema,
  deletePhotoSchema,
  formValue,
} from "@/features/album/schemas";
import {
  getTripMutationAccess,
  tripAcceptsContentWrites,
} from "@/features/trips/mutation-access";
import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function destination(
  tripId: string,
  backTo: "album" | "itinerary",
  kind: "error" | "message",
  code: string,
): Route {
  return `/trips/${tripId}/${backTo}?${kind}=${encodeURIComponent(code)}` as Route;
}

async function actor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?error=session_expired");
  return { supabase, user };
}

async function membership(
  supabase: SupabaseClient,
  tripId: string,
  userId: string,
) {
  return getTripMutationAccess(supabase, userId, tripId);
}

function refreshTripDiscussion(tripId: string) {
  revalidatePath(`/trips/${tripId}/album`);
  revalidatePath(`/trips/${tripId}/itinerary`);
}

export async function createCommentAction(formData: FormData) {
  const parsed = createCommentSchema.safeParse({
    activityId: formValue(formData, "activityId"),
    backTo: formValue(formData, "backTo"),
    body: formValue(formData, "body"),
    photoId: formValue(formData, "photoId"),
    tripId: formValue(formData, "tripId"),
  });
  if (!parsed.success) redirect("/dashboard?error=comment_invalid");

  const { supabase, user } = await actor();
  const access = await membership(supabase, parsed.data.tripId, user.id);
  if (!access) {
    redirect(
      destination(
        parsed.data.tripId,
        parsed.data.backTo,
        "error",
        "comment_forbidden",
      ),
    );
  }

  const target = parsed.data.photoId
    ? await supabase
        .from("photos")
        .select("id")
        .eq("id", parsed.data.photoId)
        .eq("trip_id", parsed.data.tripId)
        .maybeSingle()
    : await supabase
        .from("activities")
        .select("id")
        .eq("id", parsed.data.activityId!)
        .eq("trip_id", parsed.data.tripId)
        .maybeSingle();
  if (!target.data) {
    redirect(
      destination(
        parsed.data.tripId,
        parsed.data.backTo,
        "error",
        "comment_invalid",
      ),
    );
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({
      activity_id: parsed.data.activityId,
      author_id: user.id,
      body: parsed.data.body,
      photo_id: parsed.data.photoId,
      trip_id: parsed.data.tripId,
    })
    .select("id")
    .maybeSingle();
  if (error || !data) {
    redirect(
      destination(
        parsed.data.tripId,
        parsed.data.backTo,
        "error",
        "comment_unavailable",
      ),
    );
  }

  refreshTripDiscussion(parsed.data.tripId);
  redirect(
    destination(
      parsed.data.tripId,
      parsed.data.backTo,
      "message",
      "comment_created",
    ),
  );
}

export async function deleteCommentAction(formData: FormData) {
  const parsed = deleteCommentSchema.safeParse({
    backTo: formValue(formData, "backTo"),
    commentId: formValue(formData, "commentId"),
    tripId: formValue(formData, "tripId"),
  });
  if (!parsed.success) redirect("/dashboard?error=comment_invalid");

  const { supabase, user } = await actor();
  const [access, commentResult] = await Promise.all([
    membership(supabase, parsed.data.tripId, user.id),
    supabase
      .from("comments")
      .select("id, author_id")
      .eq("id", parsed.data.commentId)
      .eq("trip_id", parsed.data.tripId)
      .maybeSingle(),
  ]);
  if (
    !access ||
    !commentResult.data ||
    !canModerateOwnedContent(access.role, user.id, commentResult.data.author_id)
  ) {
    redirect(
      destination(
        parsed.data.tripId,
        parsed.data.backTo,
        "error",
        "comment_forbidden",
      ),
    );
  }

  const { data: deleted, error } = await supabase.rpc("soft_delete_comment", {
    p_comment_id: parsed.data.commentId,
    p_trip_id: parsed.data.tripId,
  });
  if (error || !deleted) {
    console.error(
      `[album:comment-delete] soft delete failed: ${error?.code ?? "no-code"} ${error?.message ?? "no row changed"}; details=${error?.details ?? "none"}; hint=${error?.hint ?? "none"}`,
    );
    redirect(
      destination(
        parsed.data.tripId,
        parsed.data.backTo,
        "error",
        "comment_unavailable",
      ),
    );
  }

  refreshTripDiscussion(parsed.data.tripId);
  redirect(
    destination(
      parsed.data.tripId,
      parsed.data.backTo,
      "message",
      "comment_deleted",
    ),
  );
}

export async function deletePhotoAction(formData: FormData) {
  const parsed = deletePhotoSchema.safeParse({
    confirm: formValue(formData, "confirm"),
    photoId: formValue(formData, "photoId"),
    tripId: formValue(formData, "tripId"),
  });
  if (!parsed.success) redirect("/dashboard?error=photo_invalid");

  const { supabase, user } = await actor();
  const [access, photoResult] = await Promise.all([
    membership(supabase, parsed.data.tripId, user.id),
    supabase
      .from("photos")
      .select("id, uploaded_by, storage_path")
      .eq("id", parsed.data.photoId)
      .eq("trip_id", parsed.data.tripId)
      .maybeSingle(),
  ]);
  if (
    !access ||
    !photoResult.data ||
    !canModerateOwnedContent(access.role, user.id, photoResult.data.uploaded_by)
  ) {
    redirect(
      destination(parsed.data.tripId, "album", "error", "photo_forbidden"),
    );
  }
  if (!tripAcceptsContentWrites(access)) {
    redirect(
      destination(parsed.data.tripId, "album", "error", "photo_read_only"),
    );
  }

  const { data: deleted, error } = await supabase.rpc("soft_delete_photo", {
    p_photo_id: parsed.data.photoId,
    p_trip_id: parsed.data.tripId,
  });
  if (error || !deleted) {
    console.error(
      `[album:photo-delete] soft delete failed: ${error?.code ?? "no-code"} ${error?.message ?? "no row changed"}; details=${error?.details ?? "none"}; hint=${error?.hint ?? "none"}`,
    );
    redirect(
      destination(parsed.data.tripId, "album", "error", "photo_unavailable"),
    );
  }

  const { error: cleanupError } = await supabase.storage
    .from(TRIP_PHOTOS_BUCKET)
    .remove([photoResult.data.storage_path]);
  if (cleanupError) {
    console.error("[album:delete] deferred object cleanup required", {
      path: photoResult.data.storage_path,
      reason: cleanupError.message,
    });
  }

  refreshTripDiscussion(parsed.data.tripId);
  redirect(
    destination(
      parsed.data.tripId,
      "album",
      "message",
      cleanupError ? "photo_deleted_cleanup_pending" : "photo_deleted",
    ),
  );
}
