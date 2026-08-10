import { Camera, Images, Link2, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CommentThread } from "@/components/album/comment-thread";
import { PhotoUploadForm } from "@/components/album/photo-upload-form";
import { TripLiveUpdates } from "@/components/realtime/trip-live-updates";
import { TripFeedback } from "@/components/trips/trip-feedback";
import { TripNav } from "@/components/trips/trip-nav";
import { deletePhotoAction } from "@/features/album/actions";
import { albumConfig } from "@/features/album/config";
import { getAlbumFeedback } from "@/features/album/feedback";
import { canModerateOwnedContent } from "@/features/album/permissions";
import { getAlbumContext } from "@/features/album/server";
import { tripIdSchema } from "@/features/trips/schemas";

export const metadata: Metadata = { title: "Álbum privado" };

const photoDate = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
});

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AlbumPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ tripId }, query] = await Promise.all([params, searchParams]);
  if (!tripIdSchema.safeParse(tripId).success) notFound();

  const requestedPage = Number(first(query.page) ?? 1);
  const context = await getAlbumContext(tripId, requestedPage);
  if (!context) notFound();

  const {
    activities,
    currentUserId,
    hasMore,
    page,
    photos,
    role,
    totalPhotos,
    trip,
  } = context;
  const feedback = getAlbumFeedback(query);
  const isCompleted = trip.status === "completed";
  const acceptsContentWrites = !isCompleted || trip.allow_completed_edits;
  const activityNames = new Map(
    activities.map((activity) => [activity.id, activity.title]),
  );

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
      <TripNav isCompleted={isCompleted} tripId={tripId} />

      <div className="mt-5">
        <TripLiveUpdates tripId={tripId} />
      </div>

      <header className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-accent text-sm font-semibold">Fase 7</p>
          <h1 className="mt-1 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
            Álbum de {trip.name}
          </h1>
          <p className="text-muted mt-3 max-w-3xl leading-7">
            Un espacio privado para las fotos del grupo. Cada imagen se abre
            mediante un permiso temporal.
          </p>
        </div>
        <span className="border-line bg-surface inline-flex items-center gap-2 self-start rounded-full border px-4 py-2 text-sm font-semibold sm:self-auto">
          <Images aria-hidden="true" className="text-accent size-4" />
          {totalPhotos} {totalPhotos === 1 ? "foto" : "fotos"}
        </span>
      </header>

      {feedback ? (
        <div className="mt-6 max-w-3xl">
          <TripFeedback feedback={feedback} />
        </div>
      ) : null}

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          {photos.length === 0 ? (
            <div className="border-line bg-surface rounded-3xl border p-8 text-center shadow-sm sm:p-12">
              <Camera
                aria-hidden="true"
                className="text-accent mx-auto size-11"
              />
              <h2 className="mt-4 text-2xl font-semibold">
                El álbum todavía está vacío
              </h2>
              <p className="text-muted mx-auto mt-2 max-w-lg leading-7">
                Subí la primera foto desde el formulario. Solo las personas de
                este viaje podrán verla y comentarla.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {photos.map((photo) => {
                const canDelete =
                  acceptsContentWrites &&
                  canModerateOwnedContent(
                    role,
                    currentUserId,
                    photo.uploaded_by,
                  );
                const activityName = photo.activity_id
                  ? activityNames.get(photo.activity_id)
                  : null;
                return (
                  <article
                    id={`photo-${photo.id}`}
                    key={photo.id}
                    className="border-line bg-surface overflow-hidden rounded-3xl border shadow-sm"
                  >
                    <div className="bg-dusk/10 relative aspect-[4/3]">
                      <Image
                        src={photo.signedUrl}
                        alt={
                          photo.description ||
                          `Foto subida por ${photo.uploaderName}`
                        }
                        fill
                        unoptimized
                        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        className="object-cover"
                      />
                    </div>
                    <div className="p-5">
                      {photo.description ? (
                        <p className="leading-6 whitespace-pre-line">
                          {photo.description}
                        </p>
                      ) : null}
                      {activityName ? (
                        <p className="text-accent mt-3 flex items-center gap-1.5 text-xs font-semibold">
                          <Link2 aria-hidden="true" className="size-3.5" />
                          {activityName}
                        </p>
                      ) : null}
                      <p className="text-muted mt-3 text-xs leading-5">
                        Subida por {photo.uploaderName} ·{" "}
                        {photoDate.format(new Date(photo.created_at))}
                      </p>

                      {canDelete ? (
                        <details className="border-line mt-4 rounded-2xl border p-3">
                          <summary className="text-muted flex cursor-pointer list-none items-center gap-2 text-xs font-semibold">
                            <Trash2 aria-hidden="true" className="size-3.5" />
                            Quitar foto
                          </summary>
                          <form
                            action={deletePhotoAction}
                            className="mt-3 space-y-3"
                          >
                            <input
                              type="hidden"
                              name="photoId"
                              value={photo.id}
                            />
                            <input type="hidden" name="tripId" value={tripId} />
                            <label className="text-muted flex items-start gap-2 text-xs leading-5">
                              <input
                                type="checkbox"
                                name="confirm"
                                value="yes"
                                required
                                className="mt-0.5 size-4 accent-[var(--color-brand)]"
                              />
                              Confirmo que quiero quitarla del álbum.
                            </label>
                            <button
                              type="submit"
                              className="text-brand hover:bg-brand/10 rounded-lg px-3 py-2 text-xs font-semibold transition"
                            >
                              Quitar definitivamente
                            </button>
                          </form>
                        </details>
                      ) : null}

                      <CommentThread
                        backTo="album"
                        comments={photo.comments}
                        currentUserId={currentUserId}
                        role={role}
                        targetId={photo.id}
                        targetType="photo"
                        tripId={tripId}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {hasMore ? (
            <div className="mt-8 text-center">
              <Link
                href={`/trips/${tripId}/album?page=${page + 1}`}
                className="border-line bg-surface hover:bg-accent-soft inline-flex rounded-xl border px-5 py-3 text-sm font-semibold transition"
              >
                Ver más fotos
              </Link>
            </div>
          ) : null}
        </div>

        <aside className="border-line bg-surface min-w-0 rounded-3xl border p-6 shadow-sm lg:sticky lg:top-6">
          <div className="flex items-center gap-3">
            <span className="bg-accent-soft text-brand grid size-10 place-items-center rounded-xl">
              <Camera aria-hidden="true" className="size-5" />
            </span>
            <div>
              <p className="text-accent text-xs font-semibold">
                {isCompleted ? "Recuerdo" : "Nueva"}
              </p>
              <h2 className="text-xl font-semibold">
                {acceptsContentWrites ? "Subir una foto" : "Álbum protegido"}
              </h2>
            </div>
          </div>
          {!acceptsContentWrites ? (
            <p className="text-muted mt-6 text-sm leading-6">
              Las fotos son de solo lectura. Podés seguir comentándolas; el
              el owner puede habilitar la edición desde Configuración.
            </p>
          ) : (
            <div className="mt-6">
              <PhotoUploadForm
                activities={activities}
                maxFileBytes={albumConfig.maxFileBytes}
                tripId={tripId}
              />
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
