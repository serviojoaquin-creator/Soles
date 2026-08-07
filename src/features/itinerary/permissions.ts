import type { TripRole } from "@/features/trips/permissions";

export function canEditActivity(
  role: TripRole,
  currentUserId: string,
  createdBy: string,
) {
  return role === "owner" || role === "admin" || currentUserId === createdBy;
}
