type SearchParams = Record<string, string | string[] | undefined>;

const messages = {
  comment_created: { kind: "success", message: "El comentario se publicó." },
  comment_deleted: { kind: "success", message: "El comentario se quitó." },
  comment_forbidden: {
    kind: "error",
    message: "No tenés permiso para moderar ese comentario.",
  },
  comment_invalid: {
    kind: "error",
    message: "Escribí un comentario válido antes de publicarlo.",
  },
  comment_unavailable: {
    kind: "error",
    message: "No pudimos guardar el comentario. Intentá nuevamente.",
  },
  photo_deleted: { kind: "success", message: "La foto se quitó del álbum." },
  photo_deleted_cleanup_pending: {
    kind: "warning",
    message:
      "La foto ya no es visible, pero el archivo requiere una limpieza manual porque Storage rechazó el borrado.",
  },
  photo_forbidden: {
    kind: "error",
    message: "No tenés permiso para quitar esa foto.",
  },
  photo_invalid: {
    kind: "error",
    message: "No pudimos identificar la foto elegida.",
  },
  photo_read_only: {
    kind: "error",
    message:
      "El viaje ya es un recuerdo. El owner debe reabrirlo antes de cambiar el álbum.",
  },
  photo_unavailable: {
    kind: "error",
    message: "No pudimos quitar la foto. Intentá nuevamente.",
  },
} as const;

export type AlbumFeedback = {
  kind: "error" | "success" | "warning";
  message: string;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function getAlbumFeedback(
  searchParams: SearchParams,
): AlbumFeedback | null {
  const code = first(searchParams.error) ?? first(searchParams.message);
  if (!code || !(code in messages)) return null;
  return messages[code as keyof typeof messages];
}
