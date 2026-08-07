import { LockKeyhole, LogIn, UsersRound } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/ui/auth-card";
import { SubmitButton } from "@/components/ui/submit-button";
import { getCurrentUser } from "@/features/auth/server";
import { acceptTripInviteAction } from "@/features/members/actions";
import { getMemberFeedback } from "@/features/members/feedback";
import { inviteTokenSchema } from "@/features/members/schemas";

export const metadata: Metadata = { title: "Invitación a un viaje" };

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ token }, query, user] = await Promise.all([
    params,
    searchParams,
    getCurrentUser(),
  ]);
  const validToken = inviteTokenSchema.safeParse(token).success;
  const feedback = validToken
    ? getMemberFeedback(query)
    : {
        kind: "error" as const,
        message: "Este enlace de invitación no tiene un formato válido.",
      };
  const invitePath = `/invite/${token}` as Route;
  const loginHref = `/login?next=${encodeURIComponent(invitePath)}` as Route;
  const registerHref =
    `/register?next=${encodeURIComponent(invitePath)}` as Route;

  return (
    <AuthCard
      title="Te invitaron a un viaje"
      description="La invitación se valida de forma segura recién cuando elegís sumarte. Soles comprobará el vencimiento, los usos y el email asociado."
      feedback={feedback}
    >
      <div className="bg-background rounded-2xl p-5">
        <span className="bg-accent-soft text-brand grid size-11 place-items-center rounded-xl">
          <UsersRound aria-hidden="true" className="size-5" />
        </span>
        <h2 className="mt-4 text-lg font-semibold">
          Un espacio privado del grupo
        </h2>
        <p className="text-muted mt-2 text-sm leading-6">
          Solo las personas aceptadas pueden ver el viaje y su contenido.
        </p>
      </div>

      {validToken && user ? (
        <form action={acceptTripInviteAction} className="mt-6">
          <input type="hidden" name="token" value={token} />
          <SubmitButton label="Sumarme al viaje" pendingLabel="Validando…" />
        </form>
      ) : validToken ? (
        <div className="mt-6 space-y-3">
          <Link
            href={loginHref}
            className="bg-brand hover:bg-brand-strong inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white transition"
          >
            <LogIn aria-hidden="true" className="size-4" />
            Ingresar para aceptar
          </Link>
          <Link
            href={registerHref}
            className="border-line hover:bg-accent-soft inline-flex h-12 w-full items-center justify-center rounded-xl border px-5 text-sm font-semibold transition"
          >
            Crear una cuenta
          </Link>
        </div>
      ) : null}

      <p className="text-muted mt-6 flex items-start gap-2 text-xs leading-5">
        <LockKeyhole aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        Por seguridad, el enlace puede vencer, agotarse o ser revocado por el
        grupo.
      </p>
    </AuthCard>
  );
}
