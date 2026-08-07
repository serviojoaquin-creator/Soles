const STORAGE_MAX_PHOTO_BYTES = 4 * 1024 * 1024;

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const albumConfig = {
  maxFileBytes: Math.min(
    positiveInteger(process.env.SOLES_MAX_PHOTO_BYTES, STORAGE_MAX_PHOTO_BYTES),
    STORAGE_MAX_PHOTO_BYTES,
  ),
  maxHeight: positiveInteger(process.env.SOLES_MAX_PHOTO_HEIGHT, 12_000),
  maxPhotosPerTrip: positiveInteger(process.env.SOLES_MAX_PHOTOS_PER_TRIP, 500),
  maxUploadsPerMinute: positiveInteger(
    process.env.SOLES_PHOTO_UPLOADS_PER_MINUTE,
    10,
  ),
  maxWidth: positiveInteger(process.env.SOLES_MAX_PHOTO_WIDTH, 12_000),
  pageSize: Math.min(
    positiveInteger(process.env.SOLES_PHOTO_PAGE_SIZE, 12),
    48,
  ),
  signedUrlSeconds: 300,
} as const;

export const TRIP_PHOTOS_BUCKET = "trip-photos";

export function formatPhotoLimit(bytes = albumConfig.maxFileBytes) {
  return `${Math.floor(bytes / (1024 * 1024))} MB`;
}
