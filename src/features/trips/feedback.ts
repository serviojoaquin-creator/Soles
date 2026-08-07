type SearchParams = Record<string, string | string[] | undefined>;

const feedbackMessages = {
  archived: {
    kind: "success",
    message: "El viaje se archivó únicamente para tu cuenta.",
  },
  cover_failed: {
    kind: "error",
    message: "No pudimos guardar la portada. El resto del viaje sigue intacto.",
  },
  cover_invalid: {
    kind: "error",
    message: "Elegí una portada JPEG, PNG o WebP de hasta 2 MB.",
  },
  cover_removed: {
    kind: "success",
    message: "La portada se quitó correctamente.",
  },
  cover_updated: {
    kind: "success",
    message: "La portada se actualizó correctamente.",
  },
  forbidden: {
    kind: "error",
    message: "No tenés permisos para realizar esa acción.",
  },
  invite_accepted: {
    kind: "success",
    message: "Ya sos parte del viaje.",
  },
  invalid_trip: {
    kind: "error",
    message: "Revisá los datos del viaje e intentá nuevamente.",
  },
  lifecycle_invalid: {
    kind: "error",
    message: "Ese cambio no corresponde al estado actual del viaje.",
  },
  trip_activated: {
    kind: "success",
    message: "El viaje ahora está en curso.",
  },
  trip_completed: {
    kind: "success",
    message: "El viaje se convirtió en un recuerdo sin perder contenido.",
  },
  trip_completed_read_only: {
    kind: "warning",
    message:
      "Este recuerdo es de solo lectura. El owner debe reabrirlo antes de editar contenido.",
  },
  trip_created: {
    kind: "success",
    message: "El viaje se creó y ya sos su owner.",
  },
  trip_created_cover_failed: {
    kind: "warning",
    message: "El viaje se creó, pero la portada no pudo guardarse.",
  },
  trip_deleted: {
    kind: "success",
    message:
      "El viaje se quitó de Soles. Su contenido no se borró físicamente.",
  },
  trip_updated: {
    kind: "success",
    message: "Los datos del viaje se guardaron correctamente.",
  },
  trip_reopened: {
    kind: "success",
    message: "El viaje volvió a estar en curso y admite ediciones nuevamente.",
  },
  left_trip: {
    kind: "success",
    message: "Saliste del viaje. El contenido del grupo sigue intacto.",
  },
  unavailable: {
    kind: "error",
    message: "No pudimos completar la acción. Intentá nuevamente.",
  },
  unarchived: {
    kind: "success",
    message: "El viaje volvió a tus secciones principales.",
  },
} as const;

export type TripFeedback = {
  kind: "error" | "success" | "warning";
  message: string;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function getTripFeedback(
  searchParams: SearchParams,
): TripFeedback | null {
  const code = first(searchParams.error) ?? first(searchParams.message);

  if (!code || !(code in feedbackMessages)) {
    return null;
  }

  return feedbackMessages[code as keyof typeof feedbackMessages];
}
