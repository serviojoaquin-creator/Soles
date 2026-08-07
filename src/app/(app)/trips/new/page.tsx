import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { TripFeedback } from "@/components/trips/trip-feedback";
import { TripForm } from "@/components/trips/trip-form";
import { createTripAction } from "@/features/trips/actions";
import { getTripFeedback } from "@/features/trips/feedback";

export const metadata: Metadata = { title: "Crear viaje" };

function todayInArgentina() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export default async function NewTripPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const feedback = getTripFeedback(await searchParams);
  const startDate = todayInArgentina();

  return (
    <section className="mx-auto w-full max-w-4xl px-5 py-9 sm:px-8 lg:py-12">
      <Link
        href="/dashboard"
        className="text-muted hover:text-foreground inline-flex items-center gap-2 text-sm font-semibold transition"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Volver a mis viajes
      </Link>

      <div className="mt-7">
        <p className="text-accent text-sm font-semibold">Una nueva historia</p>
        <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
          Crear un viaje
        </h1>
        <p className="text-muted mt-3 max-w-2xl leading-7">
          Empezá por lo esencial. El viaje y tu membresía owner se crean juntos,
          sin riesgo de que quede un viaje sin responsable.
        </p>
      </div>

      {feedback ? (
        <div className="mt-7">
          <TripFeedback feedback={feedback} />
        </div>
      ) : null}

      <div className="border-line bg-surface mt-8 rounded-[2rem] border p-6 shadow-sm sm:p-9">
        <TripForm
          action={createTripAction}
          defaults={{
            name: "",
            description: "",
            destination: "",
            start_date: startDate,
            end_date: addDays(startDate, 7),
            default_timezone: "America/Argentina/Buenos_Aires",
          }}
          showCover
          submitLabel="Crear viaje"
          pendingLabel="Creando el viaje…"
        />
      </div>
    </section>
  );
}
