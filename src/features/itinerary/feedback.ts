type SearchParams = Record<string, string | string[] | undefined>;

const messages = {
  comment_created: {
    kind: "success",
    message: "El comentario se publicó.",
  },
  comment_deleted: {
    kind: "success",
    message: "El comentario se quitó.",
  },
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
  activity_created: {
    kind: "success",
    message: "La actividad se agregó al itinerario.",
  },
  activity_deleted: {
    kind: "success",
    message: "La actividad se quitó del itinerario.",
  },
  activity_forbidden: {
    kind: "error",
    message: "No tenés permisos para modificar esa actividad.",
  },
  activity_invalid: {
    kind: "error",
    message: "Revisá los datos y horarios de la actividad.",
  },
  activity_order_unchanged: {
    kind: "success",
    message: "La actividad ya está en ese extremo del horario.",
  },
  activity_outside_range: {
    kind: "error",
    message:
      "La fecha está fuera del viaje. Marcá la confirmación del formulario si realmente querés usarla.",
  },
  activity_read_only: {
    kind: "error",
    message:
      "El viaje ya es un recuerdo. El owner debe reabrirlo antes de cambiar el itinerario.",
  },
  activity_reordered: {
    kind: "success",
    message: "El orden se actualizó correctamente.",
  },
  activity_status_updated: {
    kind: "success",
    message: "El estado se actualizó correctamente.",
  },
  activity_unavailable: {
    kind: "error",
    message: "No pudimos completar la acción. Intentá nuevamente.",
  },
  activity_updated: {
    kind: "success",
    message: "La actividad se guardó correctamente.",
  },
} as const;

export type ItineraryFeedback = { kind: "error" | "success"; message: string };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function getItineraryFeedback(
  searchParams: SearchParams,
): ItineraryFeedback | null {
  const code = first(searchParams.error) ?? first(searchParams.message);
  if (!code || !(code in messages)) return null;
  return messages[code as keyof typeof messages];
}
