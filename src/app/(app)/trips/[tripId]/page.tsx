import {
  CalendarDays,
  Clock3,
  MapPin,
  Settings2,
  UsersRound,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { TripFeedback } from "@/components/trips/trip-feedback";
import { TripNav } from "@/components/trips/trip-nav";
import { getTripFeedback } from "@/features/trips/feedback";
import {
  formatTripRange,
  tripRoleLabels,
  tripStatusLabels,
} from "@/features/trips/presentation";
import { tripIdSchema } from "@/features/trips/schemas";
import { getTripContext } from "@/features/trips/server";

export const metadata: Metadata = { title: "Resumen del viaje" };

export default async function TripOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ tripId }, query] = await Promise.all([params, searchParams]);
  if (!tripIdSchema.safeParse(tripId).success) {
    notFound();
  }

  const context = await getTripContext(tripId);
  if (!context) {
    notFound();
  }

  const { archivedAt, coverUrl, memberCount, role, trip } = context;
  const feedback = getTripFeedback(query);

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
      <TripNav isCompleted={trip.status === "completed"} tripId={tripId} />

      <div className="from-brand via-sun to-dusk relative mt-7 min-h-[22rem] overflow-hidden rounded-[2rem] bg-gradient-to-br shadow-lg">
        {coverUrl ? (
          // Signed private URLs expire after five minutes and are never stored.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={`Portada de ${trip.name}`}
            className="absolute inset-0 size-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-[#40233a]/90 via-[#40233a]/25 to-transparent" />
        <div className="relative flex min-h-[22rem] flex-col justify-end p-6 text-white sm:p-9">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#40233a] backdrop-blur">
              {tripStatusLabels[trip.status]}
            </span>
            <span className="rounded-full border border-white/35 bg-black/15 px-3 py-1 text-xs font-semibold backdrop-blur">
              {tripRoleLabels[role]}
            </span>
            {archivedAt ? (
              <span className="rounded-full border border-white/35 bg-black/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                Archivado para vos
              </span>
            ) : null}
          </div>
          <h1 className="mt-4 max-w-4xl font-serif text-4xl font-semibold tracking-tight sm:text-6xl">
            {trip.name}
          </h1>
          <p className="mt-4 flex items-center gap-2 text-sm text-white/90 sm:text-base">
            <MapPin aria-hidden="true" className="size-4 shrink-0" />
            {trip.destination}
          </p>
        </div>
      </div>

      {feedback ? (
        <div className="mt-6 max-w-3xl">
          <TripFeedback feedback={feedback} />
        </div>
      ) : null}

      <div className="mt-7 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <article className="border-line bg-surface rounded-3xl border p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-accent text-sm font-semibold">Resumen</p>
              <h2 className="mt-1 text-2xl font-semibold">
                El viaje de un vistazo
              </h2>
            </div>
            <Link
              href={`/trips/${tripId}/settings`}
              className="border-line hover:bg-accent-soft inline-flex size-11 shrink-0 items-center justify-center rounded-full border transition"
              aria-label="Configurar viaje"
            >
              <Settings2 aria-hidden="true" className="size-5" />
            </Link>
          </div>

          {trip.description ? (
            <p className="text-muted mt-6 leading-7 whitespace-pre-line">
              {trip.description}
            </p>
          ) : (
            <p className="text-muted mt-6 italic">
              Este viaje todavía no tiene una descripción.
            </p>
          )}

          <dl className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="bg-background rounded-2xl p-4">
              <dt className="text-muted flex items-center gap-2 text-xs font-semibold uppercase">
                <CalendarDays aria-hidden="true" className="size-4" />
                Fechas
              </dt>
              <dd className="mt-2 text-sm font-semibold">
                {formatTripRange(trip.start_date, trip.end_date)}
              </dd>
            </div>
            <div className="bg-background rounded-2xl p-4">
              <dt className="text-muted flex items-center gap-2 text-xs font-semibold uppercase">
                <Clock3 aria-hidden="true" className="size-4" />
                Zona horaria
              </dt>
              <dd className="mt-2 text-sm font-semibold break-all">
                {trip.default_timezone}
              </dd>
            </div>
            <div className="bg-background rounded-2xl p-4 sm:col-span-2">
              <dt className="text-muted flex items-center gap-2 text-xs font-semibold uppercase">
                <UsersRound aria-hidden="true" className="size-4" />
                Grupo actual
              </dt>
              <dd className="mt-2 text-sm font-semibold">
                {memberCount === 1
                  ? "1 integrante"
                  : `${memberCount} integrantes`}
              </dd>
            </div>
          </dl>
        </article>

        <aside className="border-line bg-surface rounded-3xl border p-6 shadow-sm sm:p-8">
          <p className="text-accent text-sm font-semibold">Próximo paso</p>
          <h2 className="mt-2 text-xl font-semibold">
            {trip.status === "completed"
              ? "Volvé al recuerdo"
              : "Armá el itinerario"}
          </h2>
          <p className="text-muted mt-3 text-sm leading-6">
            {trip.status === "completed"
              ? "Recorré la portada, las personas, el itinerario y las fotos en una sola historia."
              : "Organizá actividades por día y horario, compartilas con el grupo y marcá lo que ya hicieron."}
          </p>
          <Link
            href={
              trip.status === "completed"
                ? `/trips/${tripId}/memory`
                : `/trips/${tripId}/itinerary`
            }
            className="bg-brand hover:bg-brand-strong mt-6 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white transition"
          >
            {trip.status === "completed"
              ? "Abrir recuerdo"
              : "Abrir itinerario"}
          </Link>
        </aside>
      </div>
    </section>
  );
}
