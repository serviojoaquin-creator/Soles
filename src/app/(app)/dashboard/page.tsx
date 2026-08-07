import {
  Archive,
  ArrowRight,
  Images,
  MapPinned,
  PlaneTakeoff,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { TripCard } from "@/components/trips/trip-card";
import { TripFeedback } from "@/components/trips/trip-feedback";
import { getTripFeedback } from "@/features/trips/feedback";
import type { DashboardCategory } from "@/features/trips/presentation";
import { getDashboardTrips } from "@/features/trips/server";

export const metadata: Metadata = { title: "Mis viajes" };

const sections: Array<{
  category: DashboardCategory;
  description: string;
  empty: string;
  icon: typeof PlaneTakeoff;
  title: string;
}> = [
  {
    category: "upcoming",
    description: "Viajes que todavía están tomando forma.",
    empty: "Cuando armes un nuevo viaje, va a aparecer acá.",
    icon: PlaneTakeoff,
    title: "Próximos",
  },
  {
    category: "active",
    description: "Todo lo que el grupo está viviendo ahora.",
    empty: "No hay viajes en curso por el momento.",
    icon: MapPinned,
    title: "En curso",
  },
  {
    category: "memories",
    description: "Historias completas para volver a recorrer.",
    empty: "Los viajes finalizados se convertirán en recuerdos.",
    icon: Images,
    title: "Recuerdos",
  },
  {
    category: "archived",
    description: "Una vista privada para mantener tu cuenta ordenada.",
    empty: "No archivaste ningún viaje.",
    icon: Archive,
    title: "Archivados",
  },
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [trips, params] = await Promise.all([
    getDashboardTrips(),
    searchParams,
  ]);
  const feedback = getTripFeedback(params);

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-9 sm:px-8 lg:px-12 lg:py-12">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-accent text-sm font-semibold">Tus historias</p>
          <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
            ¿A dónde vamos ahora?
          </h1>
          <p className="text-muted mt-3 max-w-2xl leading-7">
            Organizá lo que viene, acompañá lo que está pasando y guardá lo que
            construyeron juntos.
          </p>
        </div>
        <Link
          href="/trips/new"
          className="bg-brand hover:bg-brand-strong inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-white transition"
        >
          Crear un viaje
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>

      {feedback ? (
        <div className="mt-7 max-w-2xl">
          <TripFeedback feedback={feedback} />
        </div>
      ) : null}

      {trips.length === 0 ? (
        <section className="border-line bg-surface mt-10 overflow-hidden rounded-[2rem] border p-7 shadow-sm sm:p-10">
          <div className="from-brand/15 via-sun/20 to-dusk/15 grid min-h-56 place-items-center rounded-3xl bg-gradient-to-br px-6 text-center">
            <div>
              <span className="bg-surface text-brand mx-auto grid size-14 place-items-center rounded-2xl shadow-sm">
                <PlaneTakeoff aria-hidden="true" className="size-6" />
              </span>
              <h2 className="mt-5 text-2xl font-semibold">
                Tu primer viaje empieza acá
              </h2>
              <p className="text-muted mx-auto mt-2 max-w-lg leading-7">
                Crealo con destino, fechas y zona horaria. Soles te agregará
                como owner en la misma operación segura.
              </p>
              <Link
                href="/trips/new"
                className="bg-brand hover:bg-brand-strong mt-6 inline-flex rounded-full px-6 py-3 text-sm font-semibold text-white transition"
              >
                Crear mi primer viaje
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <div className="mt-12 space-y-14">
          {sections.map(
            ({ category, description, empty, icon: Icon, title }) => {
              const items = trips
                .filter((item) => item.category === category)
                .sort((a, b) =>
                  a.trip.start_date.localeCompare(b.trip.start_date),
                );

              return (
                <section key={category} aria-labelledby={`section-${category}`}>
                  <div className="flex items-start gap-4">
                    <span className="bg-accent-soft text-brand grid size-11 shrink-0 place-items-center rounded-2xl">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <div>
                      <div className="flex items-center gap-3">
                        <h2
                          id={`section-${category}`}
                          className="text-2xl font-semibold"
                        >
                          {title}
                        </h2>
                        <span className="bg-surface border-line rounded-full border px-2.5 py-1 text-xs font-semibold">
                          {items.length}
                        </span>
                      </div>
                      <p className="text-muted mt-1 text-sm leading-6">
                        {description}
                      </p>
                    </div>
                  </div>

                  {items.length > 0 ? (
                    <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                      {items.map((item) => (
                        <TripCard key={item.trip.id} item={item} />
                      ))}
                    </div>
                  ) : (
                    <div className="border-line text-muted mt-5 rounded-2xl border border-dashed px-5 py-6 text-sm">
                      {empty}
                    </div>
                  )}
                </section>
              );
            },
          )}
        </div>
      )}
    </div>
  );
}
