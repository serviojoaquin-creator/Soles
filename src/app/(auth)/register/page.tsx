import type { Metadata } from "next";
import type { Route } from "next";

import { AuthCard, authInputClass } from "@/components/ui/auth-card";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { registerAction } from "@/features/auth/actions";
import { getFeedback } from "@/features/auth/feedback";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { safeInternalPath } from "@/lib/site-url";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const configured = hasSupabaseConfig();
  const params = await searchParams;
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next;
  const nextPath = safeInternalPath(rawNext ?? null);
  const alternateHref = `/login?next=${encodeURIComponent(nextPath)}` as Route;
  const feedback =
    getFeedback(params) ??
    (!configured
      ? {
          kind: "error" as const,
          message: "Falta conectar el proyecto Supabase de desarrollo.",
        }
      : null);

  return (
    <AuthCard
      title="Creá un lugar para sus viajes"
      description="Una cuenta alcanza para planificar con distintos grupos y conservar cada historia por separado."
      feedback={feedback}
      alternateLabel="¿Ya tenés cuenta?"
      alternateHref={alternateHref}
      alternateAction="Ingresar"
    >
      <form action={registerAction} className="space-y-5">
        <input type="hidden" name="next" value={nextPath} />
        <label className="block text-sm font-medium">
          Nombre visible
          <input
            name="displayName"
            type="text"
            autoComplete="name"
            required
            minLength={1}
            maxLength={80}
            disabled={!configured}
            placeholder="Cómo te va a ver el grupo"
            className={authInputClass}
          />
        </label>
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
        <PasswordInput
          name="password"
          label="Contraseña"
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
          label="Crear cuenta"
          pendingLabel="Creando cuenta…"
          disabled={!configured}
        />
      </form>
    </AuthCard>
  );
}
