import type { Metadata } from "next";

import { AuthCard, authInputClass } from "@/components/ui/auth-card";
import { SubmitButton } from "@/components/ui/submit-button";
import { forgotPasswordAction } from "@/features/auth/actions";
import { getFeedback } from "@/features/auth/feedback";
import { hasSupabaseConfig } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Recuperar acceso" };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const configured = hasSupabaseConfig();
  const feedback =
    getFeedback(await searchParams) ??
    (!configured
      ? {
          kind: "error" as const,
          message: "Falta conectar el proyecto Supabase de desarrollo.",
        }
      : null);

  return (
    <AuthCard
      title="Recuperar acceso"
      description="Escribí tu email y te enviaremos un enlace seguro para elegir una contraseña nueva."
      feedback={feedback}
      alternateLabel="¿Recordaste tu contraseña?"
      alternateHref="/login"
      alternateAction="Volver a ingresar"
    >
      <form action={forgotPasswordAction} className="space-y-5">
        <label className="block text-sm font-medium">
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            disabled={!configured}
            placeholder="vos@ejemplo.com"
            className={authInputClass}
          />
        </label>
        <SubmitButton
          label="Enviar enlace"
          pendingLabel="Enviando…"
          disabled={!configured}
        />
      </form>
    </AuthCard>
  );
}
