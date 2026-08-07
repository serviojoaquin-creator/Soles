import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const lifecycle = readFileSync(
  join(process.cwd(), "supabase/migrations/202607220002_phase_2_security.sql"),
  "utf8",
);
const memory = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/202607230004_phase_8_memory_read_only.sql",
  ),
  "utf8",
);

describe("phase 8 memory lifecycle contract", () => {
  it("reserves lifecycle changes for the owner and supports reopening", () => {
    expect(lifecycle).toContain("Only the owner may change the trip lifecycle");
    expect(lifecycle).toContain("and member.role = 'owner'");
    expect(lifecycle).toContain(
      "v_current_status = 'completed' and p_status = 'active'",
    );
    expect(lifecycle).toContain("completed_at = case");
    expect(lifecycle).toContain("when p_status = 'completed'");
    expect(lifecycle).toContain("else null");
  });

  it("freezes completed content in tables and private Storage", () => {
    expect(memory).toContain(
      "create function private.trip_accepts_content_writes",
    );
    expect(memory).toContain("trip.status <> 'completed'");
    expect(memory).toContain("create trigger trips_memory_read_only");
    expect(memory).toContain("create trigger activities_memory_read_only");
    expect(memory).toContain("create trigger photos_memory_read_only");
    expect(memory).toContain("bucket_id = 'trip-covers'");
    expect(memory).toContain("bucket_id = 'trip-photos'");
  });

  it("keeps comments writable and archive state individual", () => {
    expect(memory).not.toContain("comments_memory_read_only");
    expect(memory).toContain(
      "new.archived_at is distinct from old.archived_at",
    );
    expect(memory).toContain("new.user_id = auth.uid()");
    expect(memory).toContain(
      "preserving comments, reads, owner reopen, and self archive",
    );
  });

  it("does not delete or move existing trip content", () => {
    expect(memory).not.toMatch(
      /delete\s+from\s+public\.(activities|photos|comments)/i,
    );
    expect(memory).not.toMatch(
      /update\s+public\.(activities|photos|comments)\s+set/i,
    );
    expect(memory).not.toMatch(
      /insert\s+into\s+public\.(activities|photos|comments)/i,
    );
  });

  it("does not expose memory write helpers to anonymous roles", () => {
    expect(memory).toContain("from public, anon");
    expect(memory).toContain("to authenticated");
    expect(memory).not.toMatch(/to\s+(public|anon)\s*;/i);
  });
});
