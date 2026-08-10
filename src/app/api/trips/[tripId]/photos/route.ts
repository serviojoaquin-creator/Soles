import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import {
  albumConfig,
  formatPhotoLimit,
  TRIP_PHOTOS_BUCKET,
} from "@/features/album/config";
import {
  inspectPhoto,
  PhotoValidationError,
  safeOriginalName,
} from "@/features/album/image";
import { photoMetadataSchema } from "@/features/album/schemas";
import { tripIdSchema } from "@/features/trips/schemas";
import {
  getTripMutationAccess,
  tripAcceptsContentWrites,
} from "@/features/trips/mutation-access";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const errorMessages: Record<string, string> = {
  photo_activity_invalid: "La actividad elegida no pertenece a este viaje.",
  photo_content_invalid: "El archivo no contiene una imagen válida.",
  photo_dimensions_invalid: "La imagen tiene dimensiones no permitidas.",
  photo_forbidden: "No tenés permiso para subir fotos a este viaje.",
  photo_limit_reached: "Este viaje alcanzó el límite de fotos configurado.",
  photo_metadata_invalid: "Revisá la descripción y la actividad elegida.",
  photo_missing: "Elegí una foto antes de continuar.",
  photo_rate_limited:
    "Subiste varias fotos seguidas. Esperá un minuto e intentá de nuevo.",
  photo_size_invalid: `La foto debe pesar como máximo ${formatPhotoLimit()}.`,
  photo_read_only:
    "El viaje ya es un recuerdo. El owner debe reabrirlo antes de subir fotos.",
  photo_type_invalid: "Solo se aceptan archivos JPEG, PNG o WebP reales.",
  photo_unavailable: "No pudimos guardar la foto. Intentá nuevamente.",
};

function failure(code: string, status: number) {
  return NextResponse.json(
    { error: errorMessages[code] ?? errorMessages.photo_unavailable },
    { status },
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> },
) {
  const { tripId } = await params;
  if (!tripIdSchema.safeParse(tripId).success) {
    return failure("photo_metadata_invalid", 400);
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > albumConfig.maxFileBytes + 512 * 1024) {
    return failure("photo_size_invalid", 413);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return failure("photo_forbidden", 401);

  const access = await getTripMutationAccess(supabase, user.id, tripId);
  if (!access) return failure("photo_forbidden", 403);
  if (!tripAcceptsContentWrites(access)) {
    return failure("photo_read_only", 409);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return failure("photo_metadata_invalid", 400);
  }

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return failure("photo_missing", 400);
  }

  const parsed = photoMetadataSchema.safeParse({
    activityId: formData.get("activityId") ?? "",
    description: formData.get("description") ?? "",
    tripId,
  });
  if (!parsed.success) return failure("photo_metadata_invalid", 400);

  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
  const [photoCount, recentUploads] = await Promise.all([
    supabase
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("trip_id", tripId),
    supabase
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("trip_id", tripId)
      .eq("uploaded_by", user.id)
      .gte("created_at", oneMinuteAgo),
  ]);
  if (photoCount.error || recentUploads.error) {
    return failure("photo_unavailable", 503);
  }
  if ((photoCount.count ?? 0) >= albumConfig.maxPhotosPerTrip) {
    return failure("photo_limit_reached", 409);
  }
  if ((recentUploads.count ?? 0) >= albumConfig.maxUploadsPerMinute) {
    return failure("photo_rate_limited", 429);
  }

  if (parsed.data.activityId) {
    const { data: activity } = await supabase
      .from("activities")
      .select("id")
      .eq("id", parsed.data.activityId)
      .eq("trip_id", tripId)
      .maybeSingle();
    if (!activity) return failure("photo_activity_invalid", 400);
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await file.arrayBuffer());
  } catch {
    return failure("photo_content_invalid", 400);
  }

  let inspected;
  try {
    inspected = await inspectPhoto(buffer, file.type, {
      maxBytes: albumConfig.maxFileBytes,
      maxHeight: albumConfig.maxHeight,
      maxWidth: albumConfig.maxWidth,
    });
  } catch (error) {
    const code =
      error instanceof PhotoValidationError
        ? error.code
        : "photo_content_invalid";
    return failure(code, code === "photo_size_invalid" ? 413 : 400);
  }

  const storagePath = `${tripId}/${randomUUID()}.${inspected.extension}`;
  const { error: uploadError } = await supabase.storage
    .from(TRIP_PHOTOS_BUCKET)
    .upload(storagePath, buffer, {
      cacheControl: "3600",
      contentType: inspected.mimeType,
      upsert: false,
    });
  if (uploadError) {
    console.error("[album:upload] storage upload failed", uploadError.message);
    return failure("photo_unavailable", 503);
  }

  const { data: photo, error: insertError } = await supabase
    .from("photos")
    .insert({
      activity_id: parsed.data.activityId,
      description: parsed.data.description,
      height: inspected.height,
      mime_type: inspected.mimeType,
      original_name: safeOriginalName(file.name, inspected.extension),
      size_bytes: buffer.length,
      storage_path: storagePath,
      trip_id: tripId,
      uploaded_by: user.id,
      width: inspected.width,
    })
    .select("id")
    .maybeSingle();

  if (insertError || !photo) {
    const { error: cleanupError } = await supabase.storage
      .from(TRIP_PHOTOS_BUCKET)
      .remove([storagePath]);
    if (cleanupError) {
      console.error("[album:upload] orphan cleanup failed", {
        path: storagePath,
        reason: cleanupError.message,
      });
    }
    return failure("photo_unavailable", 503);
  }

  return NextResponse.json({ id: photo.id }, { status: 201 });
}
