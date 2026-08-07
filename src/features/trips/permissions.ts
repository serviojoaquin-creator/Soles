import type { Enums } from "@/types/database";

export type TripRole = Enums<"trip_role">;

export function canEditTrip(role: TripRole) {
  return role === "owner" || role === "admin";
}

export function canActivateTrip(role: TripRole) {
  return role === "owner";
}

export function canFinalizeTrip(role: TripRole) {
  return role === "owner";
}

export function canReopenTrip(role: TripRole) {
  return role === "owner";
}

export function canDeleteTrip(role: TripRole) {
  return role === "owner";
}
