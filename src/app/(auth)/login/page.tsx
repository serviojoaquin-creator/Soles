import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";

import { AuthCard, authInputClass } from "@/components/ui/auth-card";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { loginAction } from "@/features/auth/actions";
import { getFeedback } from "@/features/auth/feedback";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { safeInternalPath } from "@/lib/site-url";

export const metadata: Metadata = { title: "Ingresar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const configured = hasSupabaseConfig();
  const params = await searchParams;
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next;
  const nextPath = safeInternalPath(rawNext ?? null);
  const alternateHref =
    `/register?next=${encodeURIComponent(nextPath)}` as Route;
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
      title="Qué bueno verte"
      description="Ingresá para seguir preparando el próximo viaje o volver a uno que todavía te hace sonreír."
      feedback={feedback}
      alternateLabel="¿Todavía no tenés cuenta?"
      alternateHref={alternateHref}
      alternateAction="Crear cuenta"
    >
      <form action={loginAction} className="space-y-5">
        <input type="hidden" name="next" value={nextPath} />
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
          autoComplete="current-password"
          maxLength={72}
          disabled={!configured}
          placeholder="••••••••"
        />
        <div className="text-right">
          <Link
            href="/forgot-password"
            className="text-brand text-sm font-semibold underline-offset-4 hover:underline"
          >
            Olvidé mi contraseña
          </Link>
        </div>
        <SubmitButton
          label="Ingresar"
          pendingLabel="Ingresando…"
          disabled={!configured}
        />
      </form>
    </AuthCard>
  );
}
