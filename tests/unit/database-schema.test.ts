import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const schemaSql = readFileSync(
  resolve("supabase/migrations/202607220001_phase_2_schema.sql"),
  "utf8",
);
const securitySql = readFileSync(
  resolve("supabase/migrations/202607220002_phase_2_security.sql"),
  "utf8",
);

const exposedTables = [
  "profiles",
  "trips",
  "trip_members",
  "trip_invites",
  "activities",
  "photos",
  "comments",
] as const;

describe("Phase 2 database contract", () => {
  it.each(exposedTables)("creates and protects the %s table", (table) => {
    expect(schemaSql).toContain(`create table public.${table}`);
    expect(securitySql).toContain(
      `alter table public.${table} enable row level security`,
    );
  });

  it("keeps invitation plaintext out of durable columns", () => {
    expect(schemaSql).toContain("token_hash text not null unique");
    expect(schemaSql).not.toMatch(/\btoken\s+text\b/);
  });

  it("enforces the single-owner invariant in the database", () => {
    expect(schemaSql).toContain("trip_members_one_owner_per_trip_idx");
    expect(schemaSql).toContain("trip_members_require_one_owner");
  });

  it("provides atomic RPCs for critical operations", () => {
    expect(securitySql).toContain("create function public.create_trip(");
    expect(securitySql).toContain("create function public.accept_trip_invite(");
    expect(securitySql).toContain(
      "create function public.transfer_trip_ownership(",
    );
    expect(securitySql).toContain("create function public.set_trip_status(");
    expect(securitySql).toContain("create function public.set_trip_deleted(");
    expect(securitySql).toContain(
      "grant execute on function public.set_trip_deleted(uuid, boolean) to authenticated",
    );
  });

  it("does not grant exposed table access to anonymous users", () => {
    expect(securitySql).not.toMatch(/grant\s+[^;]+\s+to\s+anon\s*;/i);
  });
});
