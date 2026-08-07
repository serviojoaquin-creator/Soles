import { describe, expect, it } from "vitest";

import { getMemberFeedback } from "@/features/members/feedback";
import {
  canChangeMemberRole,
  canLeaveTrip,
  canManageInvites,
  canRemoveMember,
  canTransferOwnership,
} from "@/features/members/permissions";
import {
  createInviteSchema,
  inviteTokenSchema,
} from "@/features/members/schemas";
import {
  generateInviteToken,
  hashInviteToken,
  isInviteToken,
} from "@/features/members/tokens";

describe("secure invitation tokens", () => {
  it("generates unpredictable 256-bit base64url tokens", () => {
    const first = generateInviteToken();
    const second = generateInviteToken();

    expect(first).toHaveLength(43);
    expect(isInviteToken(first)).toBe(true);
    expect(inviteTokenSchema.safeParse(first).success).toBe(true);
    expect(second).not.toBe(first);
  });

  it("stores only a stable lowercase SHA-256 digest", () => {
    const token = generateInviteToken();
    const digest = hashInviteToken(token);

    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(hashInviteToken(token)).toBe(digest);
    expect(digest).not.toContain(token);
  });
});

describe("invitation validation", () => {
  const validInvite = {
    tripId: "3d11e21d-b10c-4421-af6a-f28d9e67182d",
    role: "member",
    invitedEmail: "  PERSONA@EXAMPLE.COM ",
    expiresInDays: "7",
    maxUses: "1",
  };

  it("normalizes email and accepts bounded invitation terms", () => {
    const result = createInviteSchema.parse(validInvite);
    expect(result.invitedEmail).toBe("persona@example.com");
    expect(result.maxUses).toBe(1);
  });

  it("never allows an invitation to grant owner", () => {
    expect(
      createInviteSchema.safeParse({ ...validInvite, role: "owner" }).success,
    ).toBe(false);
  });

  it("rejects invalid emails and excessive reusable links", () => {
    expect(
      createInviteSchema.safeParse({ ...validInvite, invitedEmail: "bad" })
        .success,
    ).toBe(false);
    expect(
      createInviteSchema.safeParse({ ...validInvite, maxUses: "200" }).success,
    ).toBe(false);
  });
});

describe("member authorization matrix", () => {
  const actor = "11111111-1111-4111-8111-111111111111";
  const target = "22222222-2222-4222-8222-222222222222";

  it("lets owner and admin create invitations", () => {
    expect(canManageInvites("owner")).toBe(true);
    expect(canManageInvites("admin")).toBe(true);
    expect(canManageInvites("member")).toBe(false);
  });

  it("reserves role changes and ownership transfer for the owner", () => {
    expect(canChangeMemberRole("owner", actor, "admin", target)).toBe(true);
    expect(canChangeMemberRole("admin", actor, "member", target)).toBe(false);
    expect(canTransferOwnership("owner", actor, "member", target)).toBe(true);
    expect(canTransferOwnership("admin", actor, "member", target)).toBe(false);
  });

  it("allows admins to remove members but never the owner or themselves", () => {
    expect(canRemoveMember("admin", actor, "member", target)).toBe(true);
    expect(canRemoveMember("admin", actor, "admin", target)).toBe(false);
    expect(canRemoveMember("owner", actor, "owner", target)).toBe(false);
    expect(canRemoveMember("owner", actor, "member", actor)).toBe(false);
  });

  it("requires an owner to transfer before leaving", () => {
    expect(canLeaveTrip("owner")).toBe(false);
    expect(canLeaveTrip("admin")).toBe(true);
    expect(canLeaveTrip("member")).toBe(true);
  });

  it("maps only known member feedback codes", () => {
    expect(getMemberFeedback({ message: "ownership_transferred" })?.kind).toBe(
      "success",
    );
    expect(getMemberFeedback({ error: "raw provider detail" })).toBeNull();
  });
});
