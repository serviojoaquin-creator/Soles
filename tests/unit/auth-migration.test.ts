import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve("supabase/migrations/202607220003_phase_3_auth_profiles.sql"),
  "utf8",
);

describe("Phase 3 database contract", () => {
  it("provisions a profile for every new Auth user", () => {
    expect(migration).toContain("create trigger auth_users_create_profile");
    expect(migration).toContain("insert into public.profiles");
  });

  it("keeps avatars in a private constrained bucket", () => {
    expect(migration).toContain("'avatars',\n  'avatars',\n  false");
    expect(migration).toContain("2097152");
    expect(migration).toContain("'image/jpeg', 'image/png', 'image/webp'");
  });

  it("adds all four avatar object policies", () => {
    for (const policy of [
      "avatars_select_related",
      "avatars_insert_own",
      "avatars_update_own",
      "avatars_delete_own",
    ]) {
      expect(migration).toContain(`create policy ${policy}`);
    }
  });
});
