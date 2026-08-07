import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const schema = readFileSync(
  join(process.cwd(), "supabase/migrations/202607220001_phase_2_schema.sql"),
  "utf8",
);
const security = readFileSync(
  join(process.cwd(), "supabase/migrations/202607220002_phase_2_security.sql"),
  "utf8",
);

describe("phase 5 database security contract", () => {
  it("persists only a constrained SHA-256 invitation digest", () => {
    expect(schema).toContain("token_hash text not null unique");
    expect(schema).toContain("trip_invites_token_hash_sha256");
    expect(schema).not.toMatch(/\btoken\s+text\b/);
  });

  it("locks invitations before validating and consuming a use", () => {
    const acceptFunction = security.slice(
      security.indexOf("create function public.accept_trip_invite"),
      security.indexOf("create function public.transfer_trip_ownership"),
    );

    expect(acceptFunction).toContain("for update of invite");
    expect(acceptFunction).toContain("use_count >= v_invite.max_uses");
    expect(acceptFunction).toContain("set use_count = use_count + 1");
  });

  it("protects owner removal and transfers ownership atomically", () => {
    expect(security).toContain(
      "An owner must transfer ownership before leaving",
    );
    expect(security).toContain("transfer_owner:%s:%s");
    expect(schema).toContain("trip_members_one_owner_per_trip_idx");
    expect(schema).toContain("trip_members_require_one_owner");
  });

  it("prevents admins from changing owner or admin memberships", () => {
    expect(security).toContain("old.role <> 'owner'");
    expect(security).toContain("private.current_trip_role(trip_id) = 'owner'");
    expect(security).toContain(
      "private.current_trip_role(trip_id) = 'admin' and role = 'member'",
    );
  });
});
