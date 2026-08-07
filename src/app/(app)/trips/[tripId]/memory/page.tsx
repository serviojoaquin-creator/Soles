import {
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock3,
  MapPin,
  RotateCcw,
  UsersRound,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { TripFeedback } from "@/components/trips/trip-feedback";
import { TripNav } from "@/components/trips/trip-nav";
import {
  activityStatusLabels,
  formatActivityDay,
  formatActivityTime,
  groupActivitiesByDay,
} from "@/features/itinerary/presentation";
import { getMemoryContext } from "@/features/memories/server";
import { reopenTripAction } from "@/features/trips/actions";
import { getTripFeedback } from "@/features/trips/feedback";
import { canReopenTrip } from "@/features/trips/permissions";
import { formatTripRange, tripRoleLabels } from "@/features/trips/presentation";
import { tripIdSchema } from "@/features/trips/schemas";
import { getTripContext } from "@/features/trips/server";

export const metadata: Metadata = { title: "Recuerdo del viaje" };

const completionFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "long",
  timeStyle: "short",
});

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default async function MemoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ tripId }, query] = await Promise.all([params, searchParams]);
  if (!tripIdSchema.safeParse(tripId).success) notFound();

  const tripContext = await getTripContext(tripId);
  if (!tripContext) notFound();
  if (tripContext.trip.status !== "completed") {
    redirect(`/trips/${tripId}`);
  }

  const memory = await getMemoryContext(tripId);
  if (!memory) notFound();

  const { activities, coverUrl, members, photos, role, trip } = memory;
  const feedback = getTripFeedback(query);
  const days = groupActivitiesByDay(activities);
  const completedActivities = activities.filter(
    (activity) => activity.status === "done",
  ).length;

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
      <TripNav isCompleted tripId={tripId} />

      <header className="from-brand via-sun to-dusk relative mt-7 min-h-[26rem] overflow-hidden rounded-[2rem] bg-gradient-to-br shadow-xl">
        {coverUrl ? (
          // Signed private URLs expire after five minutes and are never persisted.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={`Portada de ${trip.name}`}
            className="absolute inset-0 size-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-[#40233a]/95 via-[#40233a]/35 to-transparent" />
        <div className="relative flex min-h-[26rem] flex-col justify-end p-7 text-white sm:p-10">
          <p className="text-sm font-semibold text-white/85">
            Nuestro recuerdo
          </p>
          <h1 className="mt-2 max-w-4xl font-serif text-5xl font-semibold tracking-tight sm:text-7xl">
            {trip.name}
          </h1>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/90">
            <span className="inline-flex items-center gap-2">
              <MapPin aria-hidden="true" className="size-4" />
              {trip.destination}
            </span>
            <span className="inline-flex items-center gap-2">
              <CalendarDays aria-hidden="true" className="size-4" />
              {formatTripRange(trip.start_date, trip.end_date)}
            </span>
          </div>
        </div>
      </header>

      {feedback ? (
        <div className="mt-6 max-w-3xl">
          <TripFeedback feedback={feedback} />
        </div>
      ) : null}

      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        {[
          { icon: UsersRound, label: "Participantes", value: members.length },
          {
            icon: CheckCircle2,
            label: "Actividades realizadas",
            value: `${completedActivities}/${activities.length}`,
          },
          { icon: Camera, label: "Fotos", value: photos.length },
        ].map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="border-line bg-surface rounded-2xl border p-5 shadow-sm"
          >
            <Icon aria-hidden="true" className="text-accent size-5" />
            <p className="mt-4 text-3xl font-semibold">{value}</p>
            <p className="text-muted mt-1 text-sm">{label}</p>
          </div>
        ))}
      </div>

      <article className="border-line bg-surface mt-8 rounded-[2rem] border p-6 shadow-sm sm:p-9">
        <p className="text-accent text-sm font-semibold">La compañía</p>
        <h2 className="mt-2 font-serif text-3xl font-semibold">
          Quienes lo vivieron
        </h2>
        <div className="mt-6 flex flex-wrap gap-4">
          {members.map((member) => (
            <div
              key={member.userId}
              className="border-line flex items-center gap-3 rounded-2xl border p-3 pr-5"
            >
              <span className="bg-accent-soft text-brand grid size-11 shrink-0 place-items-center overflow-hidden rounded-full text-sm font-semibold">
                {member.avatarUrl ? (
                  // Signed private avatar URL expires after five minutes.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.avatarUrl}
                    alt={`Avatar de ${member.displayName}`}
                    className="size-full object-cover"
                  />
                ) : (
                  initials(member.displayName)
                )}
              </span>
              <span>
                <span className="block text-sm font-semibold">
                  {member.displayName}
                </span>
                <span className="text-muted block text-xs">
                  {tripRoleLabels[member.role]}
                </span>
              </span>
            </div>
          ))}
        </div>
      </article>

      <article className="border-line bg-surface mt-8 rounded-[2rem] border p-6 shadow-sm sm:p-9">
        <p className="text-accent text-sm font-semibold">
          La historia, día por día
        </p>
        <h2 className="mt-2 font-serif text-3xl font-semibold">
          Itinerario cronológico
        </h2>
        {days.length ? (
          <div className="mt-8 space-y-8">
            {days.map((day) => (
              <section key={day.date}>
                <h3 className="text-lg font-semibold">
                  {formatActivityDay(day.date)}
                </h3>
                <div className="border-brand/20 mt-4 space-y-4 border-l-2 pl-5">
                  {day.items.map((activity) => (
                    <div key={activity.id} className="relative">
                      <span className="bg-sun absolute top-2 -left-[1.8rem] size-3 rounded-full ring-4 ring-white" />
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold">{activity.title}</h4>
                        <span className="bg-background rounded-full px-2.5 py-1 text-xs font-semibold">
                          {activityStatusLabels[activity.status]}
                        </span>
                      </div>
                      <p className="text-muted mt-1 flex flex-wrap gap-3 text-sm">
                        {formatActivityTime(activity.start_time) ? (
                          <span className="inline-flex items-center gap-1">
                            <Clock3 aria-hidden="true" className="size-3.5" />
                            {formatActivityTime(activity.start_time)}
                          </span>
                        ) : null}
                        {activity.location_name ? (
                          <span>{activity.location_name}</span>
                        ) : null}
                      </p>
                      {activity.description ? (
                        <p className="text-muted mt-2 text-sm leading-6">
                          {activity.description}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <p className="text-muted mt-6">
            Este viaje no tuvo actividades cargadas.
          </p>
        )}
        <Link
          href={`/trips/${tripId}/itinerary`}
          className="text-brand mt-7 inline-flex text-sm font-semibold underline-offset-4 hover:underline"
        >
          Ver actividades y comentarios
        </Link>
      </article>

      <article className="border-line bg-surface mt-8 rounded-[2rem] border p-6 shadow-sm sm:p-9">
        <p className="text-accent text-sm font-semibold">Álbum privado</p>
        <h2 className="mt-2 font-serif text-3xl font-semibold">
          Momentos compartidos
        </h2>
        {photos.length ? (
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {photos.map((photo) => (
              <figure
                key={photo.id}
                className="group relative aspect-square overflow-hidden rounded-2xl"
              >
                {/* Signed private URLs expire after five minutes and are never persisted. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.signedUrl}
                  alt={photo.description ?? photo.original_name}
                  className="size-full object-cover transition duration-500 group-hover:scale-[1.03]"
                />
                {photo.description ? (
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3 pt-8 text-xs text-white">
                    {photo.description}
                  </figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        ) : (
          <p className="text-muted mt-6">Este viaje no tiene fotos cargadas.</p>
        )}
        <Link
          href={`/trips/${tripId}/album`}
          className="text-brand mt-7 inline-flex text-sm font-semibold underline-offset-4 hover:underline"
        >
          Abrir álbum y comentarios
        </Link>
      </article>

      <aside className="border-line bg-surface mt-8 rounded-[2rem] border p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-semibold">Recuerdo protegido</h2>
        <p className="text-muted mt-2 max-w-3xl text-sm leading-6">
          El contenido quedó en modo de solo lectura. Los comentarios siguen
          habilitados y archivar este viaje afecta únicamente a tu cuenta.
          {trip.completed_at
            ? ` Se finalizó el ${completionFormatter.format(new Date(trip.completed_at))}.`
            : ""}
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/trips/${tripId}/settings`}
            className="border-line hover:bg-accent-soft inline-flex h-11 items-center justify-center rounded-xl border px-5 text-sm font-semibold transition"
          >
            Archivar o ver ajustes
          </Link>
          {canReopenTrip(role) ? (
            <form
              action={reopenTripAction}
              className="border-line rounded-xl border p-4 sm:max-w-md"
            >
              <input type="hidden" name="tripId" value={tripId} />
              <label className="flex items-start gap-2 text-xs leading-5">
                <input
                  type="checkbox"
                  name="confirm"
                  value="yes"
                  required
                  className="mt-1"
                />
                Confirmo que quiero reabrir el viaje y volver a habilitar sus
                ediciones.
              </label>
              <button
                type="submit"
                className="bg-dusk hover:bg-foreground mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold text-white transition"
              >
                <RotateCcw aria-hidden="true" className="size-4" />
                Reabrir viaje
              </button>
            </form>
          ) : null}
        </div>
      </aside>
    </section>
  );
}
