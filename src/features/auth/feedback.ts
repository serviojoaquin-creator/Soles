type SearchParams = Record<string, string | string[] | undefined>;

const messages = {
  auth_database_unavailable:
    "La cuenta no pudo completarse porque la base de Soles todavía no está preparada.",
  auth_required: "Ingresá para continuar.",
  avatar_invalid: "Elegí una imagen JPEG, PNG o WebP de hasta 2 MB.",
  avatar_updated: "Tu avatar se actualizó correctamente.",
  callback_failed: "El enlace no es válido o ya venció. Solicitá uno nuevo.",
  check_email: "Revisá tu email para confirmar la cuenta.",
  configuration:
    "Falta configurar Supabase para este entorno. Revisá las variables de entorno del sitio.",
  email_not_confirmed:
    "Primero confirmá tu email desde el mensaje que te enviamos. Revisá también la carpeta de spam.",
  email_not_authorized:
    "Supabase no está autorizado a enviar confirmaciones a ese email. Usá un correo autorizado del proyecto o configurá un proveedor SMTP propio.",
  email_provider_disabled:
    "El registro por email está deshabilitado temporalmente.",
  invalid_credentials: "El email o la contraseña no son correctos.",
  invalid_email: "Ingresá una dirección de email válida.",
  password_updated: "Tu contraseña se actualizó correctamente.",
  profile_updated: "Tu perfil se guardó correctamente.",
  recovery_sent:
    "Si existe una cuenta con ese email, vas a recibir un enlace para recuperar el acceso.",
  recovery_rate_limit:
    "Hubo demasiados intentos. Esperá unos minutos antes de solicitar otro enlace.",
  recovery_unavailable:
    "No pudimos enviar el enlace en este momento. Intentá nuevamente más tarde.",
  register_failed:
    "No pudimos crear la cuenta. Probá con otro email o intentá más tarde.",
  signup_disabled: "La creación de cuentas está deshabilitada temporalmente.",
  signup_rate_limit:
    "Hubo demasiados intentos. Esperá unos minutos antes de volver a probar.",
  session_expired: "La sesión venció. Ingresá nuevamente.",
  update_failed: "No pudimos guardar el cambio. Intentá nuevamente.",
  validation: "Revisá los datos ingresados e intentá nuevamente.",
  weak_password:
    "La contraseña es demasiado débil. Usá al menos 8 caracteres y evitá combinaciones fáciles de adivinar.",
} as const;

export type FeedbackCode = keyof typeof messages;

export function loginErrorFeedbackCode(code?: string): FeedbackCode {
  return code === "email_not_confirmed"
    ? "email_not_confirmed"
    : "invalid_credentials";
}

export function registerErrorFeedbackCode(code?: string): FeedbackCode {
  switch (code) {
    case "email_address_invalid":
    case "validation_failed":
      return "invalid_email";
    case "email_address_not_authorized":
      return "email_not_authorized";
    case "email_provider_disabled":
      return "email_provider_disabled";
    case "signup_disabled":
      return "signup_disabled";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "signup_rate_limit";
    case "weak_password":
      return "weak_password";
    case "unexpected_failure":
      return "auth_database_unavailable";
    default:
      return "register_failed";
  }
}

export function recoveryErrorFeedbackCode(code?: string): FeedbackCode {
  return code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit"
    ? "recovery_rate_limit"
    : "recovery_unavailable";
}

export type Feedback = {
  kind: "error" | "success";
  message: string;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function getFeedback(searchParams: SearchParams): Feedback | null {
  const errorCode = first(searchParams.error);
  const messageCode = first(searchParams.message);

  if (errorCode && errorCode in messages) {
    return {
      kind: "error",
      message: messages[errorCode as keyof typeof messages],
    };
  }

  if (messageCode && messageCode in messages) {
    return {
      kind: "success",
      message: messages[messageCode as keyof typeof messages],
    };
  }

  return null;
}
