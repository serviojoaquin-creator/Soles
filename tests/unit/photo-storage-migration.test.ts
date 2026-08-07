import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/202607230003_phase_7_private_photos.sql",
  ),
  "utf8",
);
const uploadRoute = readFileSync(
  join(process.cwd(), "src/app/api/trips/[tripId]/photos/route.ts"),
  "utf8",
);

describe("phase 7 private photo storage", () => {
  it("creates a private bucket constrained to 4 MB and supported image types", () => {
    expect(migration).toContain("'trip-photos'");
    expect(migration).toContain("public = false");
    expect(migration).toContain("4194304");
    expect(migration).toContain("'image/jpeg', 'image/png', 'image/webp'");
  });

  it("requires exact trip UUID/photo UUID paths", () => {
    expect(migration).toContain("create function private.trip_photo_trip_id");
    expect(migration).toMatch(
      /\[0-9a-f\]\{12\}\/\[0-9a-f\]\{8\}-\[0-9a-f\]\{4\}/,
    );
    expect(migration).toContain("\\.(jpg|png|webp)$");
  });

  it("limits reads and uploads to members and deletes to uploaders or managers", () => {
    expect(migration).toContain("trip_photos_select_member");
    expect(migration).toContain("trip_photos_insert_member");
    expect(migration).toContain("trip_photos_delete_uploader_or_manager");
    expect(migration).toContain("private.is_trip_member");
    expect(migration).toContain("private.can_manage_trip_photo_object");
    expect(migration).not.toContain("to anon");
    expect(migration).not.toContain("to public");
  });

  it("uses the authenticated client and compensates failed metadata inserts", () => {
    expect(uploadRoute).not.toContain("service_role");
    expect(uploadRoute).not.toContain("SUPABASE_SERVICE");
    expect(uploadRoute).toContain("inspectPhoto");
    expect(uploadRoute).toContain(".remove([storagePath])");
    expect(uploadRoute).not.toContain("signedUrl");
  });
});
