import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import {
  formatTripRange,
  tripRoleLabels,
  tripStatusLabels,
} from "@/features/trips/presentation";
import type { DashboardTrip } from "@/features/trips/server";

export function TripCard({ item }: { item: DashboardTrip }) {
  const { coverUrl, role, trip } = item;
  const href: Route =
    trip.status === "completed"
      ? (`/trips/${trip.id}/memory` as Route)
      : (`/trips/${trip.id}` as Route);

  return (
    <Link
      href={href}
      className="border-line bg-surface group overflow-hidden rounded-3xl border shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="from-brand via-sun to-dusk relative h-40 overflow-hidden bg-gradient-to-br">
        {coverUrl ? (
          // Signed private URLs expire after five minutes and are never persisted.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={`Portada de ${trip.name}`}
            className="size-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(255,255,255,.45),transparent_25%),linear-gradient(130deg,transparent_40%,rgba(64,35,58,.22))]" />
        )}
        <span className="bg-surface/90 text-foreground absolute top-4 left-4 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur">
          {tripStatusLabels[trip.status]}
        </span>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-muted text-xs font-semibold tracking-wide uppercase">
              {tripRoleLabels[role]}
            </p>
            <h3 className="mt-1 truncate text-xl font-semibold">{trip.name}</h3>
          </div>
          <ArrowUpRight
            aria-hidden="true"
            className="text-muted group-hover:text-brand mt-1 size-5 shrink-0 transition"
          />
        </div>
        <p className="text-muted mt-4 flex items-center gap-2 text-sm">
          <MapPin aria-hidden="true" className="size-4 shrink-0" />
          <span className="truncate">{trip.destination}</span>
        </p>
        <p className="text-muted mt-2 flex items-center gap-2 text-sm">
          <CalendarDays aria-hidden="true" className="size-4 shrink-0" />
          {formatTripRange(trip.start_date, trip.end_date)}
        </p>
      </div>
    </Link>
  );
}
