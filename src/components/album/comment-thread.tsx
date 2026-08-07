import { MessageCircle, Trash2 } from "lucide-react";

import {
  createCommentAction,
  deleteCommentAction,
} from "@/features/album/actions";
import { canModerateOwnedContent } from "@/features/album/permissions";
import type { AlbumComment } from "@/features/album/server";
import type { TripRole } from "@/features/trips/permissions";

type CommentThreadProps = {
  backTo: "album" | "itinerary";
  comments: AlbumComment[];
  currentUserId: string;
  role: TripRole;
  targetId: string;
  targetType: "activity" | "photo";
  tripId: string;
};

const commentDate = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function CommentThread({
  backTo,
  comments,
  currentUserId,
  role,
  targetId,
  targetType,
  tripId,
}: CommentThreadProps) {
  return (
    <section
      className="border-line mt-5 border-t pt-4"
      aria-label="Comentarios"
    >
      <h4 className="flex items-center gap-2 text-sm font-semibold">
        <MessageCircle aria-hidden="true" className="size-4" />
        Comentarios ({comments.length})
      </h4>

      {comments.length ? (
        <ul className="mt-3 space-y-3">
          {comments.map((comment) => (
            <li
              key={comment.id}
              className="bg-background rounded-2xl px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold">{comment.authorName}</p>
                  <time
                    dateTime={comment.created_at}
                    className="text-muted text-xs"
                  >
                    {commentDate.format(new Date(comment.created_at))}
                  </time>
                </div>
                {canModerateOwnedContent(
                  role,
                  currentUserId,
                  comment.author_id,
                ) ? (
                  <form action={deleteCommentAction}>
                    <input type="hidden" name="backTo" value={backTo} />
                    <input type="hidden" name="commentId" value={comment.id} />
                    <input type="hidden" name="tripId" value={tripId} />
                    <button
                      type="submit"
                      className="text-muted hover:bg-brand/10 hover:text-brand rounded-lg p-1.5 transition"
                      aria-label={`Quitar comentario de ${comment.authorName}`}
                    >
                      <Trash2 aria-hidden="true" className="size-3.5" />
                    </button>
                  </form>
                ) : null}
              </div>
              <p className="mt-2 text-sm leading-6 whitespace-pre-line">
                {comment.body}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted mt-2 text-sm">Todavía no hay comentarios.</p>
      )}

      <form
        action={createCommentAction}
        className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2"
      >
        <input type="hidden" name="backTo" value={backTo} />
        <input
          type="hidden"
          name={targetType === "photo" ? "photoId" : "activityId"}
          value={targetId}
        />
        <input type="hidden" name="tripId" value={tripId} />
        <label
          className="sr-only"
          htmlFor={`comment-${targetType}-${targetId}`}
        >
          Escribir comentario
        </label>
        <input
          id={`comment-${targetType}-${targetId}`}
          name="body"
          type="text"
          maxLength={2000}
          required
          placeholder="Escribí un comentario"
          className="border-line bg-surface-strong min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="bg-dusk hover:bg-foreground rounded-xl px-3 py-2 text-xs font-semibold text-white transition"
        >
          Publicar
        </button>
      </form>
    </section>
  );
}
