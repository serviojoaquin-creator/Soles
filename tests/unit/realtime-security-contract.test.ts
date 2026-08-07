import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/202607230006_phase_9_private_realtime.sql",
  ),
  "utf8",
);
const client = readFileSync(
  join(process.cwd(), "src/components/realtime/trip-live-updates.tsx"),
  "utf8",
);
const albumActions = readFileSync(
  join(process.cwd(), "src/features/album/actions.ts"),
  "utf8",
);
const itineraryActions = readFileSync(
  join(process.cwd(), "src/features/itinerary/actions.ts"),
  "utf8",
);

describe("Phase 9 private Realtime contract", () => {
  it("broadcasts changes from activities, photos, and comments only", () => {
    expect(
      migration.match(/create trigger \w+_private_realtime/g),
    ).toHaveLength(3);
    expect(migration).toContain("on public.activities");
    expect(migration).toContain("on public.photos");
    expect(migration).toContain("on public.comments");
    expect(migration).not.toMatch(
      /on public\.(profiles|trips|trip_members|trip_invites)/,
    );
  });

  it("authorizes a private topic through trip membership", () => {
    expect(migration).toContain("on realtime.messages");
    expect(migration).toContain("to authenticated");
    expect(migration).toContain("private.is_trip_member");
    expect(migration).toContain("'trip:' || v_trip_id::text");
    expect(migration).toContain("true");
    expect(migration).not.toContain("alter table realtime.messages");
    expect(migration).not.toMatch(/to\s+(anon|public)\s*;/i);
  });

  it("sends only an invalidation signal and cleans up the private channel", () => {
    expect(migration).toContain("'event_id'");
    expect(migration).toContain("'record_id'");
    expect(migration).not.toContain("realtime.broadcast_changes");
    expect(client).toContain("config: { private: true }");
    expect(client).toContain("supabase.removeChannel(channel)");
    expect(client).toContain("router.refresh()");
    expect(client).not.toContain("service_role");
  });

  it("revalidates every mutation instead of relying on Realtime", () => {
    expect(albumActions).toContain("refreshTripDiscussion");
    expect(albumActions).toContain("revalidatePath");
    expect(itineraryActions).toContain("revalidateItinerary");
    expect(itineraryActions).toContain("revalidatePath");
  });
});
