import sharp from "sharp";

export type SupportedPhoto = {
  extension: "jpg" | "png" | "webp";
  height: number;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  width: number;
};

const formats = {
  jpeg: { extension: "jpg", mimeType: "image/jpeg" },
  png: { extension: "png", mimeType: "image/png" },
  webp: { extension: "webp", mimeType: "image/webp" },
} as const;

export class PhotoValidationError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "PhotoValidationError";
  }
}

export async function inspectPhoto(
  buffer: Buffer,
  declaredMimeType: string,
  limits: { maxBytes: number; maxHeight: number; maxWidth: number },
): Promise<SupportedPhoto> {
  if (buffer.length === 0 || buffer.length > limits.maxBytes) {
    throw new PhotoValidationError("photo_size_invalid");
  }

  let metadata: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    metadata = await sharp(buffer, {
      animated: false,
      failOn: "error",
      limitInputPixels: limits.maxHeight * limits.maxWidth,
    }).metadata();
  } catch {
    throw new PhotoValidationError("photo_content_invalid");
  }

  const format = metadata.format as keyof typeof formats | undefined;
  const detected = format ? formats[format] : undefined;
  if (!detected || detected.mimeType !== declaredMimeType) {
    throw new PhotoValidationError("photo_type_invalid");
  }
  if (!metadata.width || !metadata.height) {
    throw new PhotoValidationError("photo_dimensions_invalid");
  }
  if (
    metadata.width > limits.maxWidth ||
    metadata.height > limits.maxHeight ||
    (metadata.pages ?? 1) > 1
  ) {
    throw new PhotoValidationError("photo_dimensions_invalid");
  }

  return {
    ...detected,
    height: metadata.height,
    width: metadata.width,
  };
}

export function safeOriginalName(
  name: string,
  extension: SupportedPhoto["extension"],
) {
  const cleaned = name
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}._ -]/gu, "_")
    .trim()
    .slice(0, 180);
  return cleaned || `foto.${extension}`;
}
