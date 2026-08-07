import type { Tables } from "@/types/database";

export type TripRow = Tables<"trips">;
export type DashboardCategory = "upcoming" | "active" | "memories" | "archived";

export function dashboardCategory(
  trip: Pick<TripRow, "status">,
  archivedAt: string | null,
): DashboardCategory {
  if (archivedAt) {
    return "archived";
  }

  if (trip.status === "active") {
    return "active";
  }

  if (trip.status === "completed") {
    return "memories";
  }

  return "upcoming";
}

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatTripDate(value: string) {
  return dateFormatter.format(new Date(`${value}T00:00:00Z`));
}

export function formatTripRange(startDate: string, endDate: string) {
  if (startDate === endDate) {
    return formatTripDate(startDate);
  }

  return `${formatTripDate(startDate)} – ${formatTripDate(endDate)}`;
}

export const tripStatusLabels = {
  planning: "Próximo",
  active: "En curso",
  completed: "Recuerdo",
} as const;

export const tripRoleLabels = {
  owner: "Owner",
  admin: "Admin",
  member: "Miembro",
} as const;
