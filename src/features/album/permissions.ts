import type { TripRole } from "@/features/trips/permissions";

export function canModerateOwnedContent(
  role: TripRole,
  currentUserId: string,
  authorId: string,
) {
  return authorId === currentUserId || role === "owner" || role === "admin";
}
