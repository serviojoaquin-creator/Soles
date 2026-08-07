import type { TripRole } from "@/features/trips/permissions";

export function canManageInvites(role: TripRole) {
  return role === "owner" || role === "admin";
}

export function canChangeMemberRole(
  actorRole: TripRole,
  actorId: string,
  targetRole: TripRole,
  targetId: string,
) {
  return (
    actorRole === "owner" && actorId !== targetId && targetRole !== "owner"
  );
}

export function canRemoveMember(
  actorRole: TripRole,
  actorId: string,
  targetRole: TripRole,
  targetId: string,
) {
  if (actorId === targetId || targetRole === "owner") {
    return false;
  }

  return (
    actorRole === "owner" || (actorRole === "admin" && targetRole === "member")
  );
}

export function canLeaveTrip(role: TripRole) {
  return role !== "owner";
}

export function canTransferOwnership(
  actorRole: TripRole,
  actorId: string,
  targetRole: TripRole,
  targetId: string,
) {
  return (
    actorRole === "owner" && actorId !== targetId && targetRole !== "owner"
  );
}
