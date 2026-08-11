import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { completedEditingTripSchema } from "@/features/trips/schemas";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/202608100001_completed_trip_editing_option.sql",
  ),
  "utf8",
);
const mutationAccess = readFileSync(
  join(process.cwd(), "src/features/trips/mutation-access.ts"),
  "utf8",
);

describe("completed trip editing option", () => {
  it("allows ordinary role-based writes only when the owner enabled them", () => {
    expect(mutationAccess).toContain("allowCompletedEdits: boolean");
    expect(mutationAccess).toContain('access.status !== "completed"');
    expect(mutationAccess).toContain("access.allowCompletedEdits");
  });

  it("requires explicit confirmation for the owner toggle", () => {
    expect(
      completedEditingTripSchema.safeParse({
        allowEdits: "true",
        confirm: "yes",
        tripId: "3d11e21d-b10c-4421-af6a-f28d9e67182d",
      }).success,
    ).toBe(true);
    expect(
      completedEditingTripSchema.safeParse({
        allowEdits: "true",
        confirm: "no",
        tripId: "3d11e21d-b10c-4421-af6a-f28d9e67182d",
      }).success,
    ).toBe(false);
  });

  it("uses an owner-only RPC and leaves anonymous callers without access", () => {
    expect(migration).toContain("allow_completed_edits boolean not null default false");
    expect(migration).toContain("create function public.set_trip_completed_editing");
    expect(migration).toContain("and role = 'owner'");
    expect(migration).toContain("completed-editing:%s:%s");
    expect(migration).toContain("from public, anon");
    expect(migration).toContain("to authenticated");
  });

  it("keeps existing memories editable and enables the default for new trips", () => {
    const defaultMigration = readFileSync(
      "supabase/migrations/202608110001_completed_trips_editable_by_default.sql",
      "utf8",
    );

    expect(defaultMigration).toContain(
      "alter column allow_completed_edits set default true",
    );
    expect(defaultMigration).toContain("where status = 'completed'");
    expect(defaultMigration).toContain("set allow_completed_edits = true");
  });

  it("keeps comments unchanged while updating photos and activities safely", () => {
    expect(migration).not.toContain("soft_delete_comment");
    expect(migration).toContain("create or replace function public.soft_delete_photo");
    expect(migration).toContain("create or replace function public.soft_delete_activity");
    expect(migration).toContain("v_status = 'completed' and not v_allow_completed_edits");
  });
});
