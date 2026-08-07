import type { Metadata } from "next";

import { AuthCard } from "@/components/ui/auth-card";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { updatePasswordAction } from "@/features/auth/actions";
import { getFeedback } from "@/features/auth/feedback";
import { hasSupabaseConfig } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default async function ResetPasswordPage({
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
      title="Elegir una nueva contraseña"
      description="El enlace de recuperación abre una sesión temporal. Elegí una contraseña que no uses en otros servicios."
      feedback={feedback}
      alternateLabel="¿El enlace venció?"
      alternateHref="/login"
      alternateAction="Volver al ingreso"
    >
      <form action={updatePasswordAction} className="space-y-5">
        <PasswordInput
          name="password"
          label="Nueva contraseña"
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          disabled={!configured}
          placeholder="Mínimo 8 caracteres"
        />
        <PasswordInput
          name="confirmPassword"
          label="Repetir contraseña"
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          disabled={!configured}
          placeholder="Repetí tu contraseña"
        />
        <SubmitButton
          label="Guardar contraseña"
          pendingLabel="Guardando…"
          disabled={!configured}
        />
      </form>
    </AuthCard>
  );
}
