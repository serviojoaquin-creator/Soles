import {
  ArrowDown,
  ArrowUp,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  MapPin,
  Pencil,
  RotateCcw,
  Trash2,
  XCircle,
} from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CommentThread } from "@/components/album/comment-thread";
import { ActivityForm } from "@/components/itinerary/activity-form";
import { TripLiveUpdates } from "@/components/realtime/trip-live-updates";
import { TripFeedback } from "@/components/trips/trip-feedback";
import { TripNav } from "@/components/trips/trip-nav";
import {
  createActivityAction,
  deleteActivityAction,
  reorderActivityAction,
  updateActivityAction,
  updateActivityStatusAction,
} from "@/features/itinerary/actions";
import { getItineraryFeedback } from "@/features/itinerary/feedback";
import { canEditActivity } from "@/features/itinerary/permissions";
import {
  activityStatusLabels,
  formatActivityDay,
  formatActivityTime,
  groupActivitiesByDay,
  type ActivityRow,
} from "@/features/itinerary/presentation";
import { getItineraryContext } from "@/features/itinerary/server";
import { formatTripRange } from "@/features/trips/presentation";
import { tripIdSchema } from "@/features/trips/schemas";

export const metadata: Metadata = { title: "Itinerario" };

const statusClasses = {
  planned: "bg-sun/15 text-foreground",
  done: "bg-dusk/15 text-foreground",
  cancelled: "bg-brand/10 text-brand-strong",
} as const;

function HiddenActivityFields({
  activity,
  tripId,
}: {
  activity: ActivityRow;
  tripId: string;
}) {
  return (
    <>
      <input type="hidden" name="tripId" value={tripId} />
      <input type="hidden" name="activityId" value={activity.id} />
    </>
  );
}

export default async function ItineraryPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ tripId }, query] = await Promise.all([params, searchParams]);
  if (!tripIdSchema.safeParse(tripId).success) notFound();

  const context = await getItineraryContext(tripId);
  if (!context) notFound();

  const { activities, commentsByActivity, currentUserId, role, trip } = context;
  const feedback = getItineraryFeedback(query);
  const days = groupActivitiesByDay(activities);
  const isCompleted = trip.status === "completed";
  const acceptsContentWrites = !isCompleted || trip.allow_completed_edits;

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
      <TripNav isCompleted={isCompleted} tripId={tripId} />

      <div className="mt-5">
        <TripLiveUpdates tripId={tripId} />
      </div>

      <header className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-accent text-sm font-semibold">Fase 6</p>
          <h1 className="mt-1 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
            Itinerario de {trip.name}
          </h1>
          <p className="text-muted mt-3 max-w-3xl leading-7">
            {formatTripRange(trip.start_date, trip.end_date)} · Horarios locales
            conservados con su zona IANA.
          </p>
        </div>
        <span className="border-line bg-surface rounded-full border px-4 py-2 text-xs font-semibold break-all">
          {trip.default_timezone}
        </span>
      </header>

      {feedback ? (
        <div className="mt-6 max-w-3xl">
          <TripFeedback feedback={feedback} />
        </div>
      ) : null}

      <div className="mt-8 grid items-start gap-7 lg:grid-cols-[1fr_23rem]">
        <div className="space-y-7">
          {days.length === 0 ? (
            <div className="border-line bg-surface rounded-3xl border p-8 text-center shadow-sm sm:p-12">
              <CalendarPlus
                aria-hidden="true"
                className="text-accent mx-auto size-10"
              />
              <h2 className="mt-4 text-2xl font-semibold">
                Todavía no hay actividades
              </h2>
              <p className="text-muted mx-auto mt-2 max-w-lg leading-7">
                Agregá la primera desde el formulario. El grupo la verá ordenada
                por día, horario y posición.
              </p>
            </div>
          ) : (
            days.map(({ date, items }) => (
              <section key={date} aria-labelledby={`day-${date}`}>
                <div className="flex items-center gap-3">
                  <span className="from-brand to-sun size-3 rounded-full bg-gradient-to-br" />
                  <h2 id={`day-${date}`} className="text-xl font-semibold">
                    {formatActivityDay(date)}
                  </h2>
                </div>

                <div className="border-line ml-[0.34rem] space-y-4 border-l pt-4 pl-5 sm:pl-7">
                  {items.map((activity) => {
                    const canEdit =
                      acceptsContentWrites &&
                      canEditActivity(role, currentUserId, activity.created_by);
                    const sameTime = items.filter(
                      (item) => item.start_time === activity.start_time,
                    );
                    const orderIndex = sameTime.findIndex(
                      (item) => item.id === activity.id,
                    );
                    const startTime = formatActivityTime(activity.start_time);
                    const endTime = formatActivityTime(activity.end_time);

                    return (
                      <article
                        key={activity.id}
                        className="border-line bg-surface relative rounded-3xl border p-5 shadow-sm sm:p-6"
                      >
                        <span className="bg-sun absolute top-7 -left-[1.8rem] size-3 rounded-full ring-4 ring-[var(--color-background)] sm:-left-[2.3rem]" />
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[activity.status]}`}
                              >
                                {activityStatusLabels[activity.status]}
                              </span>
                              <span className="text-muted flex items-center gap-1 text-xs font-semibold">
                                <Clock3
                                  aria-hidden="true"
                                  className="size-3.5"
                                />
                                {startTime
                                  ? `${startTime}${endTime ? `–${endTime}` : ""}`
                                  : "Sin horario"}
                              </span>
                            </div>
                            <h3 className="mt-3 text-xl font-semibold">
                              {activity.title}
                            </h3>
                          </div>

                          {canEdit && sameTime.length > 1 ? (
                            <div
                              className="flex gap-1"
                              aria-label="Cambiar orden dentro del mismo horario"
                              role="group"
                            >
                              <form action={reorderActivityAction}>
                                <HiddenActivityFields
                                  activity={activity}
                                  tripId={tripId}
                                />
                                <input
                                  type="hidden"
                                  name="direction"
                                  value="up"
                                />
                                <button
                                  type="submit"
                                  disabled={orderIndex === 0}
                                  className="border-line hover:bg-accent-soft rounded-full border p-2 transition disabled:cursor-not-allowed disabled:opacity-35"
                                  aria-label={`Subir ${activity.title}`}
                                >
                                  <ArrowUp
                                    aria-hidden="true"
                                    className="size-4"
                                  />
                                </button>
                              </form>
                              <form action={reorderActivityAction}>
                                <HiddenActivityFields
                                  activity={activity}
                                  tripId={tripId}
                                />
                                <input
                                  type="hidden"
                                  name="direction"
                                  value="down"
                                />
                                <button
                                  type="submit"
                                  disabled={orderIndex === sameTime.length - 1}
                                  className="border-line hover:bg-accent-soft rounded-full border p-2 transition disabled:cursor-not-allowed disabled:opacity-35"
                                  aria-label={`Bajar ${activity.title}`}
                                >
                                  <ArrowDown
                                    aria-hidden="true"
                                    className="size-4"
                                  />
                                </button>
                              </form>
                            </div>
                          ) : null}
                        </div>

                        <p className="text-muted mt-2 text-xs break-all">
                          {activity.timezone}
                        </p>
                        {activity.location_name ? (
                          <p className="text-muted mt-4 flex items-start gap-2 text-sm">
                            <MapPin
                              aria-hidden="true"
                              className="text-accent mt-0.5 size-4 shrink-0"
                            />
                            {activity.location_name}
                          </p>
                        ) : null}
                        {activity.description ? (
                          <p className="text-muted mt-4 leading-7 whitespace-pre-line">
                            {activity.description}
                          </p>
                        ) : null}

                        <CommentThread
                          backTo="itinerary"
                          comments={commentsByActivity.get(activity.id) ?? []}
                          currentUserId={currentUserId}
                          role={role}
                          targetId={activity.id}
                          targetType="activity"
                          tripId={tripId}
                        />

                        {canEdit ? (
                          <div className="border-line mt-5 border-t pt-4">
                            <div className="flex flex-wrap gap-2">
                              {activity.status !== "done" ? (
                                <form action={updateActivityStatusAction}>
                                  <HiddenActivityFields
                                    activity={activity}
                                    tripId={tripId}
                                  />
                                  <input
                                    type="hidden"
                                    name="status"
                                    value="done"
                                  />
                                  <button
                                    type="submit"
                                    className="bg-dusk/10 hover:bg-dusk/20 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition"
                                  >
                                    <CheckCircle2
                                      aria-hidden="true"
                                      className="size-4"
                                    />
                                    Realizada
                                  </button>
                                </form>
                              ) : (
                                <form action={updateActivityStatusAction}>
                                  <HiddenActivityFields
                                    activity={activity}
                                    tripId={tripId}
                                  />
                                  <input
                                    type="hidden"
                                    name="status"
                                    value="planned"
                                  />
                                  <button
                                    type="submit"
                                    className="bg-sun/10 hover:bg-sun/20 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition"
                                  >
                                    <RotateCcw
                                      aria-hidden="true"
                                      className="size-4"
                                    />
                                    Planificada
                                  </button>
                                </form>
                              )}
                              {activity.status !== "cancelled" ? (
                                <form action={updateActivityStatusAction}>
                                  <HiddenActivityFields
                                    activity={activity}
                                    tripId={tripId}
                                  />
                                  <input
                                    type="hidden"
                                    name="status"
                                    value="cancelled"
                                  />
                                  <button
                                    type="submit"
                                    className="bg-brand/10 hover:bg-brand/20 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition"
                                  >
                                    <XCircle
                                      aria-hidden="true"
                                      className="size-4"
                                    />
                                    Cancelar
                                  </button>
                                </form>
                              ) : null}
                              {activity.status === "cancelled" ? (
                                <form action={updateActivityStatusAction}>
                                  <HiddenActivityFields
                                    activity={activity}
                                    tripId={tripId}
                                  />
                                  <input
                                    type="hidden"
                                    name="status"
                                    value="planned"
                                  />
                                  <button
                                    type="submit"
                                    className="bg-sun/10 hover:bg-sun/20 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition"
                                  >
                                    <RotateCcw
                                      aria-hidden="true"
                                      className="size-4"
                                    />
                                    Planificada
                                  </button>
                                </form>
                              ) : null}
                            </div>

                            <details className="border-line mt-4 rounded-2xl border p-4">
                              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold">
                                <Pencil aria-hidden="true" className="size-4" />
                                Editar actividad
                              </summary>
                              <div className="mt-5">
                                <ActivityForm
                                  action={updateActivityAction}
                                  activityId={activity.id}
                                  defaults={activity}
                                  pendingLabel="Guardando..."
                                  submitLabel="Guardar cambios"
                                  tripEndDate={trip.end_date}
                                  tripId={tripId}
                                  tripStartDate={trip.start_date}
                                />
                              </div>
                            </details>

                            <form
                              action={deleteActivityAction}
                              className="mt-4 flex flex-wrap items-center gap-3"
                            >
                              <HiddenActivityFields
                                activity={activity}
                                tripId={tripId}
                              />
                              <label className="text-muted flex items-center gap-2 text-xs">
                                <input
                                  type="checkbox"
                                  name="confirm"
                                  value="yes"
                                  required
                                  className="size-4 accent-[var(--color-brand)]"
                                />
                                Confirmar eliminación
                              </label>
                              <button
                                type="submit"
                                className="text-brand hover:bg-brand/10 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition"
                              >
                                <Trash2 aria-hidden="true" className="size-4" />
                                Quitar
                              </button>
                            </form>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>

        <aside className="border-line bg-surface rounded-3xl border p-6 shadow-sm lg:sticky lg:top-6">
          <div className="flex items-center gap-3">
            <span className="bg-accent-soft text-brand grid size-10 place-items-center rounded-xl">
              <CalendarPlus aria-hidden="true" className="size-5" />
            </span>
            <div>
              <p className="text-accent text-xs font-semibold">
                {isCompleted ? "Recuerdo" : "Nueva"}
              </p>
              <h2 className="text-xl font-semibold">
                {acceptsContentWrites ? "Agregar actividad" : "Itinerario protegido"}
              </h2>
            </div>
          </div>
          {!acceptsContentWrites ? (
            <p className="text-muted mt-6 text-sm leading-6">
              Las actividades son de solo lectura. Podés seguir comentándolas;
              el owner puede habilitar la edición desde Configuración.
            </p>
          ) : (
            <div className="mt-6">
              <ActivityForm
                action={createActivityAction}
                defaults={{
                  activity_date: trip.start_date,
                  description: null,
                  end_time: null,
                  location_name: null,
                  start_time: null,
                  timezone: trip.default_timezone,
                  title: "",
                }}
                pendingLabel="Agregando..."
                submitLabel="Agregar al itinerario"
                tripEndDate={trip.end_date}
                tripId={tripId}
                tripStartDate={trip.start_date}
              />
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
