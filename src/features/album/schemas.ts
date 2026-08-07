import { z } from "zod";

const uuid = z.uuid();

export const photoMetadataSchema = z.object({
  activityId: z
    .union([uuid, z.literal("")])
    .transform((value) => value || null),
  description: z
    .string()
    .trim()
    .max(2_000)
    .transform((value) => value || null),
  tripId: uuid,
});

export const createCommentSchema = z
  .object({
    activityId: z
      .union([uuid, z.literal("")])
      .transform((value) => value || null),
    backTo: z.enum(["album", "itinerary"]),
    body: z.string().trim().min(1).max(2_000),
    photoId: z.union([uuid, z.literal("")]).transform((value) => value || null),
    tripId: uuid,
  })
  .refine((value) => Boolean(value.photoId) !== Boolean(value.activityId), {
    message: "A comment must have exactly one target.",
  });

export const deleteCommentSchema = z.object({
  backTo: z.enum(["album", "itinerary"]),
  commentId: uuid,
  tripId: uuid,
});

export const deletePhotoSchema = z.object({
  confirm: z.literal("yes"),
  photoId: uuid,
  tripId: uuid,
});

export function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
