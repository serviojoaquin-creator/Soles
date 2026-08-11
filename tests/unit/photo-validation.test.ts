import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { inspectPhoto, safeOriginalName } from "@/features/album/image";

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZnoYAAAAASUVORK5CYII=",
  "base64",
);
const limits = { maxBytes: 1024, maxHeight: 100, maxWidth: 100 };

describe("real photo inspection", () => {
  it("does not rely on a native image runtime in the upload path", () => {
    const implementation = readFileSync(
      join(process.cwd(), "src/features/album/image.ts"),
      "utf8",
    );

    expect(implementation).not.toContain('from "sharp"');
    expect(implementation).toContain("function jpegSize");
    expect(implementation).toContain("function pngSize");
    expect(implementation).toContain("function webpSize");
  });

  it("detects a real PNG and its dimensions", async () => {
    await expect(
      inspectPhoto(onePixelPng, "image/png", limits),
    ).resolves.toEqual({
      extension: "png",
      height: 1,
      mimeType: "image/png",
      width: 1,
    });
  });

  it("rejects a file whose declared MIME type does not match its content", async () => {
    await expect(
      inspectPhoto(onePixelPng, "image/jpeg", limits),
    ).rejects.toMatchObject({
      code: "photo_type_invalid",
    });
  });

  it("rejects invalid bytes and configured size limits", async () => {
    await expect(
      inspectPhoto(Buffer.from("not an image"), "image/png", limits),
    ).rejects.toMatchObject({
      code: "photo_content_invalid",
    });
    await expect(
      inspectPhoto(onePixelPng, "image/png", { ...limits, maxBytes: 10 }),
    ).rejects.toMatchObject({
      code: "photo_size_invalid",
    });
  });

  it("sanitizes the original filename before metadata persistence", () => {
    expect(safeOriginalName(" viaje/<final>?.png ", "png")).toBe(
      "viaje__final__.png",
    );
  });
});
