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

type DetectedFormat = keyof typeof formats;
type ImageSize = { animated: boolean; height: number; width: number };

export class PhotoValidationError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "PhotoValidationError";
  }
}

function pngSize(buffer: Buffer): ImageSize | null {
  const signature = "89504e470d0a1a0a";
  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== signature) {
    return null;
  }

  let animated = false;
  for (let offset = 8; offset + 12 <= buffer.length; ) {
    const length = buffer.readUInt32BE(offset);
    const chunkEnd = offset + 12 + length;
    if (chunkEnd > buffer.length) return null;
    if (buffer.subarray(offset + 4, offset + 8).toString("ascii") === "acTL") {
      animated = true;
    }
    offset = chunkEnd;
  }

  return {
    animated,
    height: buffer.readUInt32BE(20),
    width: buffer.readUInt32BE(16),
  };
}

function jpegSize(buffer: Buffer): ImageSize | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;

  for (let offset = 2; offset + 4 <= buffer.length; ) {
    if (buffer[offset] !== 0xff) return null;
    while (buffer[offset] === 0xff) offset += 1;
    const marker = buffer[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > buffer.length) return null;
    const length = buffer.readUInt16BE(offset);
    if (length < 7 || offset + length > buffer.length) return null;
    const isStartOfFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isStartOfFrame) {
      return {
        animated: false,
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      };
    }
    offset += length;
  }

  return null;
}

function webpSize(buffer: Buffer): ImageSize | null {
  if (
    buffer.length < 30 ||
    buffer.subarray(0, 4).toString("ascii") !== "RIFF" ||
    buffer.subarray(8, 12).toString("ascii") !== "WEBP"
  ) {
    return null;
  }

  const kind = buffer.subarray(12, 16).toString("ascii");
  if (kind === "VP8X") {
    const flags = buffer[20];
    return {
      animated: (flags & 0x02) !== 0,
      height: buffer.readUIntLE(27, 3) + 1,
      width: buffer.readUIntLE(24, 3) + 1,
    };
  }
  if (kind === "VP8 ") {
    if (buffer.length < 30 || buffer[23] !== 0x9d || buffer[24] !== 0x01 || buffer[25] !== 0x2a) return null;
    return {
      animated: false,
      height: buffer.readUInt16LE(28) & 0x3fff,
      width: buffer.readUInt16LE(26) & 0x3fff,
    };
  }
  if (kind === "VP8L" && buffer[20] === 0x2f) {
    const bits = buffer.readUInt32LE(21);
    return {
      animated: false,
      height: ((bits >> 14) & 0x3fff) + 1,
      width: (bits & 0x3fff) + 1,
    };
  }
  return null;
}

function inspectImage(buffer: Buffer): { format: DetectedFormat; size: ImageSize } | null {
  const png = pngSize(buffer);
  if (png) return { format: "png", size: png };
  const jpeg = jpegSize(buffer);
  if (jpeg) return { format: "jpeg", size: jpeg };
  const webp = webpSize(buffer);
  return webp ? { format: "webp", size: webp } : null;
}

export async function inspectPhoto(
  buffer: Buffer,
  declaredMimeType: string,
  limits: { maxBytes: number; maxHeight: number; maxWidth: number },
): Promise<SupportedPhoto> {
  if (buffer.length === 0 || buffer.length > limits.maxBytes) {
    throw new PhotoValidationError("photo_size_invalid");
  }

  const inspected = inspectImage(buffer);
  if (!inspected) throw new PhotoValidationError("photo_content_invalid");
  const detected = formats[inspected.format];
  if (detected.mimeType !== declaredMimeType) {
    throw new PhotoValidationError("photo_type_invalid");
  }
  if (
    !Number.isSafeInteger(inspected.size.width) ||
    !Number.isSafeInteger(inspected.size.height) ||
    inspected.size.width < 1 ||
    inspected.size.height < 1 ||
    inspected.size.width > limits.maxWidth ||
    inspected.size.height > limits.maxHeight ||
    inspected.size.animated
  ) {
    throw new PhotoValidationError("photo_dimensions_invalid");
  }

  return {
    ...detected,
    height: inspected.size.height,
    width: inspected.size.width,
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
