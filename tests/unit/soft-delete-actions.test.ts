import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const albumActions = readFileSync(
  join(process.cwd(), "src/features/album/actions.ts"),
  "utf8",
);
const itineraryActions = readFileSync(
  join(process.cwd(), "src/features/itinerary/actions.ts"),
  "utf8",
);

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/202607230005_fix_soft_delete_rpcs.sql",
  ),
  "utf8",
);

describe("soft-delete action contract", () => {
  it("uses atomic RPCs instead of direct updates affected by SELECT RLS", () => {
    expect(albumActions).toContain('rpc("soft_delete_comment"');
    expect(albumActions).toContain('rpc("soft_delete_photo"');
    expect(itineraryActions).toContain('"soft_delete_activity"');
    expect(albumActions).not.toContain(".update({ deleted_at:");
    expect(itineraryActions).not.toContain(".update({ deleted_at:");
  });

  it("checks identity, membership, moderation rights, and completed state in SQL", () => {
    expect(migration).toContain("security definer");
    expect(migration).toContain("member.user_id = v_actor");
    expect(migration).toContain("v_role not in ('owner', 'admin')");
    expect(migration).toContain("v_status = 'completed'");
    expect(migration).toContain("from public, anon");
    expect(migration).toContain("to authenticated");
  });

  it("keeps server-side diagnostics for rejected deletions", () => {
    expect(albumActions).toContain("[album:comment-delete] soft delete failed");
    expect(albumActions).toContain("[album:photo-delete] soft delete failed");
    expect(itineraryActions).toContain(
      "[itinerary:activity-delete] soft delete failed",
    );
  });
});
