import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/202607230001_phase_4_trip_covers.sql",
  ),
  "utf8",
);

describe("phase 4 private trip covers", () => {
  it("creates a private, constrained storage bucket", () => {
    expect(migration).toContain("'trip-covers'");
    expect(migration).toContain("public = false");
    expect(migration).toContain("2097152");
    expect(migration).toContain("'image/jpeg', 'image/png', 'image/webp'");
  });

  it("limits reads to members and writes to managers", () => {
    expect(migration).toContain("private.is_trip_member");
    expect(migration).toContain("private.can_manage_trip");
    expect(migration).toContain("trip_covers_select_member");
    expect(migration).toContain("trip_covers_insert_manager");
    expect(migration).toContain("trip_covers_delete_manager");
  });

  it("does not grant storage access to anonymous users", () => {
    expect(migration).not.toContain("to anon");
    expect(migration).not.toContain("to public");
  });
});
