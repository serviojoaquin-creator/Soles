import type { Tables } from "@/types/database";

export type ActivityRow = Tables<"activities">;

export function compareActivities(a: ActivityRow, b: ActivityRow) {
  const dateDifference = a.activity_date.localeCompare(b.activity_date);
  if (dateDifference !== 0) return dateDifference;

  if (a.start_time && !b.start_time) return -1;
  if (!a.start_time && b.start_time) return 1;
  const timeDifference = (a.start_time ?? "").localeCompare(b.start_time ?? "");
  if (timeDifference !== 0) return timeDifference;

  if (a.position !== b.position) return a.position - b.position;
  return a.created_at.localeCompare(b.created_at);
}

export function sortActivities(activities: ActivityRow[]) {
  return [...activities].sort(compareActivities);
}

export function groupActivitiesByDay(activities: ActivityRow[]) {
  const groups = new Map<string, ActivityRow[]>();
  for (const activity of sortActivities(activities)) {
    const current = groups.get(activity.activity_date) ?? [];
    current.push(activity);
    groups.set(activity.activity_date, current);
  }
  return Array.from(groups, ([date, items]) => ({ date, items }));
}

const dayFormatter = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function formatActivityDay(value: string) {
  const formatted = dayFormatter.format(new Date(`${value}T00:00:00Z`));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function formatActivityTime(value: string | null) {
  return value ? value.slice(0, 5) : null;
}

export const activityStatusLabels = {
  planned: "Planificada",
  done: "Realizada",
  cancelled: "Cancelada",
} as const;
