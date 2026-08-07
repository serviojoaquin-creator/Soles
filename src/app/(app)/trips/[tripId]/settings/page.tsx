import {
  Archive,
  ImagePlus,
  Play,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TripFeedback } from "@/components/trips/trip-feedback";
import { TripForm } from "@/components/trips/trip-form";
import { TripNav } from "@/components/trips/trip-nav";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  activateTripAction,
  archiveTripAction,
  deleteTripAction,
  finalizeTripAction,
  removeTripCoverAction,
  reopenTripAction,
  updateTripAction,
  uploadTripCoverAction,
} from "@/features/trips/actions";
import { getTripFeedback } from "@/features/trips/feedback";
import {
  canActivateTrip,
  canDeleteTrip,
  canEditTrip,
  canFinalizeTrip,
  canReopenTrip,
} from "@/features/trips/permissions";
import {
  tripRoleLabels,
  tripStatusLabels,
} from "@/features/trips/presentation";
import { tripIdSchema } from "@/features/trips/schemas";
import { getTripContext } from "@/features/trips/server";

export const metadata: Metadata = { title: "Configurar viaje" };

export default async function SettingsPage({
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

  const { archivedAt, coverUrl, role, trip } = context;
  const feedback = getTripFeedback(query);
  const isCompleted = trip.status === "completed";
  const editable = canEditTrip(role) && !isCompleted;

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
      <TripNav isCompleted={isCompleted} tripId={tripId} />

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-accent text-sm font-semibold">Configuración</p>
          <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
            Ajustes de {trip.name}
          </h1>
          <p className="text-muted mt-3 max-w-2xl leading-7">
            Tu rol es {tripRoleLabels[role].toLowerCase()}. Cada cambio se
            valida nuevamente en el servidor y en las políticas de la base.
          </p>
        </div>
        <span className="border-line bg-surface inline-flex w-fit rounded-full border px-4 py-2 text-sm font-semibold">
          {tripStatusLabels[trip.status]}
        </span>
      </div>

      {feedback ? (
        <div className="mt-7 max-w-3xl">
          <TripFeedback feedback={feedback} />
        </div>
      ) : null}

      <div className="mt-8 grid gap-7 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="border-line bg-surface rounded-[2rem] border p-6 shadow-sm sm:p-9">
          <div className="flex items-start gap-3">
            <span className="bg-accent-soft text-brand grid size-11 shrink-0 place-items-center rounded-xl">
              <ShieldCheck aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h2 className="text-xl font-semibold">Datos generales</h2>
              <p className="text-muted mt-1 text-sm leading-6">
                Owner y admin pueden editar estos datos. El ciclo de vida está
                separado para evitar cambios accidentales.
              </p>
            </div>
          </div>

          {editable ? (
            <div className="mt-8">
              <TripForm
                action={updateTripAction}
                defaults={trip}
                submitLabel="Guardar cambios"
                pendingLabel="Guardando…"
                tripId={tripId}
              />
            </div>
          ) : (
            <div className="border-line text-muted mt-8 rounded-2xl border border-dashed p-5 text-sm leading-6">
              {isCompleted
                ? "Este recuerdo es de solo lectura. El owner puede reabrirlo desde el control de estado."
                : "Como miembro podés ver la información, pero solo owner y admin pueden editar los datos generales."}
            </div>
          )}
        </article>

        <div className="space-y-7">
          <article className="border-line bg-surface rounded-[2rem] border p-6 shadow-sm sm:p-7">
            <div className="flex items-start gap-3">
              <span className="bg-accent-soft text-brand grid size-11 shrink-0 place-items-center rounded-xl">
                <ImagePlus aria-hidden="true" className="size-5" />
              </span>
              <div>
                <h2 className="text-xl font-semibold">Portada privada</h2>
                <p className="text-muted mt-1 text-sm leading-6">
                  Solo integrantes del viaje pueden verla.
                </p>
              </div>
            </div>

            <div className="from-brand via-sun to-dusk relative mt-5 h-48 overflow-hidden rounded-2xl bg-gradient-to-br">
              {coverUrl ? (
                // Signed private URLs expire after five minutes and are never stored.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverUrl}
                  alt={`Portada actual de ${trip.name}`}
                  className="size-full object-cover"
                />
              ) : null}
            </div>

            {editable ? (
              <>
                <form action={uploadTripCoverAction} className="mt-5 space-y-4">
                  <input type="hidden" name="tripId" value={tripId} />
                  <label className="block text-sm font-medium" htmlFor="cover">
                    {trip.cover_path ? "Reemplazar imagen" : "Agregar imagen"}
                  </label>
                  <input
                    id="cover"
                    name="cover"
                    type="file"
                    required
                    accept="image/jpeg,image/png,image/webp"
                    className="border-line file:bg-accent-soft file:text-brand w-full rounded-xl border bg-white p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-2 file:font-semibold"
                  />
                  <p className="text-muted text-xs leading-5">
                    JPEG, PNG o WebP. Máximo 2 MB.
                  </p>
                  <SubmitButton
                    label="Guardar portada"
                    pendingLabel="Subiendo…"
                  />
                </form>

                {trip.cover_path ? (
                  <form action={removeTripCoverAction} className="mt-3">
                    <input type="hidden" name="tripId" value={tripId} />
                    <button
                      type="submit"
                      className="border-line text-muted hover:bg-accent-soft h-11 w-full rounded-xl border px-4 text-sm font-semibold transition"
                    >
                      Quitar portada
                    </button>
                  </form>
                ) : null}
              </>
            ) : null}
          </article>

          <article className="border-line bg-surface rounded-[2rem] border p-6 shadow-sm sm:p-7">
            <h2 className="text-xl font-semibold">Estado del viaje</h2>
            <p className="text-muted mt-2 text-sm leading-6">
              El estado es explícito: las fechas por sí solas nunca cambian el
              viaje automáticamente.
            </p>

            {trip.status === "planning" && canActivateTrip(role) ? (
              <form action={activateTripAction} className="mt-5">
                <input type="hidden" name="tripId" value={tripId} />
                <button
                  type="submit"
                  className="bg-dusk hover:bg-foreground inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition"
                >
                  <Play aria-hidden="true" className="size-4" />
                  Marcar como en curso
                </button>
              </form>
            ) : null}

            {trip.status !== "completed" && canFinalizeTrip(role) ? (
              <form
                action={finalizeTripAction}
                className="border-line mt-5 rounded-xl border p-4"
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
                  Confirmo que quiero convertir el viaje en un recuerdo de solo
                  lectura sin borrar ningún contenido.
                </label>
                <button
                  type="submit"
                  className="bg-brand hover:bg-brand-strong mt-3 h-11 w-full rounded-xl px-4 text-sm font-semibold text-white transition"
                >
                  Finalizar viaje
                </button>
              </form>
            ) : null}

            {trip.status === "completed" && canReopenTrip(role) ? (
              <form
                action={reopenTripAction}
                className="border-line mt-5 rounded-xl border p-4"
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
                  Confirmo que quiero reabrir el viaje y volver a habilitar las
                  ediciones.
                </label>
                <button
                  type="submit"
                  className="bg-dusk hover:bg-foreground mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition"
                >
                  <RotateCcw aria-hidden="true" className="size-4" />
                  Reabrir viaje
                </button>
              </form>
            ) : null}

            {!canFinalizeTrip(role) ? (
              <p className="bg-background mt-5 rounded-xl px-4 py-3 text-sm">
                {trip.status === "planning"
                  ? "Solo el owner puede iniciar el viaje."
                  : trip.status === "active"
                    ? "El viaje está en curso. Solo el owner puede finalizarlo."
                    : "Este viaje ya es un recuerdo. Solo el owner puede reabrirlo."}
              </p>
            ) : null}
          </article>

          <article className="border-line bg-surface rounded-[2rem] border p-6 shadow-sm sm:p-7">
            <div className="flex items-start gap-3">
              <Archive
                aria-hidden="true"
                className="text-accent mt-1 size-5 shrink-0"
              />
              <div>
                <h2 className="text-xl font-semibold">
                  {archivedAt ? "Desarchivar para vos" : "Archivar para vos"}
                </h2>
                <p className="text-muted mt-2 text-sm leading-6">
                  Este cambio afecta solo tu dashboard. Las demás personas no
                  verán ninguna diferencia.
                </p>
              </div>
            </div>
            <form action={archiveTripAction} className="mt-5">
              <input type="hidden" name="tripId" value={tripId} />
              <input
                type="hidden"
                name="archived"
                value={archivedAt ? "false" : "true"}
              />
              <button
                type="submit"
                className="border-line hover:bg-accent-soft h-12 w-full rounded-xl border px-4 text-sm font-semibold transition"
              >
                {archivedAt ? "Volver a mis viajes" : "Archivar viaje"}
              </button>
            </form>
          </article>

          {canDeleteTrip(role) ? (
            <article className="border-brand/40 bg-surface rounded-[2rem] border p-6 shadow-sm sm:p-7">
              <div className="flex items-start gap-3">
                <Trash2
                  aria-hidden="true"
                  className="text-brand mt-1 size-5 shrink-0"
                />
                <div>
                  <h2 className="text-xl font-semibold">Eliminar viaje</h2>
                  <p className="text-muted mt-2 text-sm leading-6">
                    Lo quitaremos para todos los integrantes mediante borrado
                    lógico. Los datos no se destruyen físicamente.
                  </p>
                </div>
              </div>

              {isCompleted ? (
                <p className="bg-background mt-5 rounded-xl px-4 py-3 text-sm leading-6">
                  Para eliminar este recuerdo, primero tenés que reabrir el
                  viaje.
                </p>
              ) : (
                <form
                  action={deleteTripAction}
                  className="border-brand/30 mt-5 rounded-xl border p-4"
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
                    Confirmo que quiero quitar este viaje de Soles para todas
                    las personas integrantes.
                  </label>
                  <button
                    type="submit"
                    className="bg-brand hover:bg-brand-strong mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                    Eliminar viaje
                  </button>
                </form>
              )}
            </article>
          ) : null}
        </div>
      </div>
    </section>
  );
}
