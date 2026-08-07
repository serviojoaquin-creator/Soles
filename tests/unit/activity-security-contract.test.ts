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
const timezonePermissions = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/202607230002_phase_6_timezone_permissions.sql",
  ),
  "utf8",
);

describe("phase 6 activity security contract", () => {
  it("validates local time order and IANA timezones in the database", () => {
    expect(schema).toContain("constraint activities_time_order");
    expect(schema).toContain(
      "create function private.validate_activity_timezone",
    );
    expect(schema).toContain("from pg_catalog.pg_timezone_names");
    expect(schema).toContain("create trigger activities_validate_timezone");
    expect(timezonePermissions).toContain(
      "grant execute on function private.is_valid_timezone(text) to authenticated",
    );
    expect(timezonePermissions).toContain(
      "revoke all on function private.is_valid_timezone(text) from public, anon",
    );
  });

  it("keeps activity identity immutable and supports soft deletion", () => {
    expect(security).toContain("create function private.guard_activity_write");
    expect(security).toContain(
      "Activity identity, trip, creator, and creation timestamp are immutable",
    );
    expect(schema).toContain("deleted_at timestamptz");
  });

  it("enables RLS and limits updates to the author or a manager", () => {
    expect(security).toContain(
      "alter table public.activities enable row level security",
    );
    expect(security).toContain("create policy activities_select_member");
    expect(security).toContain("create policy activities_insert_member");
    expect(security).toContain(
      "create policy activities_update_author_or_manager",
    );
    expect(security).toContain("created_by = auth.uid()");
    expect(security).toContain(
      "private.can_manage_trip(trip_id) or created_by = auth.uid()",
    );
  });

  it("indexes the deterministic daily ordering used by the timeline", () => {
    expect(schema).toContain("activities_trip_day_position_idx");
    expect(schema).toContain(
      "on public.activities (trip_id, activity_date, position, created_at)",
    );
  });
});
