type SearchParams = Record<string, string | string[] | undefined>;

const messages = {
  invite_accepted: {
    kind: "success",
    message: "Ya sos parte del viaje.",
  },
  invite_revoked: {
    kind: "success",
    message: "La invitación quedó revocada.",
  },
  invite_unavailable: {
    kind: "error",
    message:
      "La invitación no está disponible. Puede haber vencido, sido revocada o alcanzado su límite de usos.",
  },
  left_trip: {
    kind: "success",
    message: "Saliste del viaje. El contenido del grupo sigue intacto.",
  },
  member_removed: {
    kind: "success",
    message: "La persona ya no forma parte del viaje.",
  },
  member_role_updated: {
    kind: "success",
    message: "El rol se actualizó correctamente.",
  },
  members_forbidden: {
    kind: "error",
    message: "No tenés permisos para administrar esa membresía.",
  },
  members_invalid: {
    kind: "error",
    message: "Revisá la acción e intentá nuevamente.",
  },
  members_read_only: {
    kind: "error",
    message:
      "Este recuerdo es de solo lectura. El owner debe reabrirlo antes de cambiar participantes o invitaciones.",
  },
  members_unavailable: {
    kind: "error",
    message: "No pudimos completar la acción. Intentá nuevamente.",
  },
  ownership_transferred: {
    kind: "success",
    message: "El ownership se transfirió de forma segura.",
  },
} as const;

export type MemberFeedback = {
  kind: "error" | "success";
  message: string;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function getMemberFeedback(
  searchParams: SearchParams,
): MemberFeedback | null {
  const code = first(searchParams.error) ?? first(searchParams.message);
  if (!code || !(code in messages)) {
    return null;
  }

  return messages[code as keyof typeof messages];
}
