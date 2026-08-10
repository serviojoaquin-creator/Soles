import type { Tables } from "@/types/database";

export type TripRow = Tables<"trips">;
export type DashboardCategory = "upcoming" | "active" | "memories" | "archived";

function todayInTimezone(timezone: string, reference: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  }).formatToParts(reference);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export function dashboardCategory(
  trip: Pick<TripRow, "default_timezone" | "start_date" | "status">,
  archivedAt: string | null,
  reference = new Date(),
): DashboardCategory {
  if (archivedAt) {
    return "archived";
  }

  if (trip.status === "completed") {
    return "memories";
  }

  if (
    trip.status === "active" ||
    trip.start_date <= todayInTimezone(trip.default_timezone, reference)
  ) {
    return "active";
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
