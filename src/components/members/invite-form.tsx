"use client";

import { Check, Copy, Link2, Send } from "lucide-react";
import { useActionState, useState } from "react";

import { authInputClass } from "@/components/ui/auth-card";
import {
  createInviteAction,
  type CreateInviteState,
} from "@/features/members/actions";

const initialCreateInviteState: CreateInviteState = { status: "idle" };

export function InviteForm({ tripId }: { tripId: string }) {
  const [state, formAction, pending] = useActionState(
    createInviteAction,
    initialCreateInviteState,
  );
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const copied = copiedUrl === state.inviteUrl;

  async function copyInvite() {
    if (!state.inviteUrl) {
      return;
    }

    const inviteUrl = state.inviteUrl;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedUrl(inviteUrl);
    } catch {
      setCopiedUrl(null);
    }
  }

  return (
    <div>
      <form action={formAction} className="space-y-5">
        <input type="hidden" name="tripId" value={tripId} />
        <label className="block text-sm font-medium">
          Email específico{" "}
          <span className="text-muted font-normal">(opcional)</span>
          <input
            name="invitedEmail"
            type="email"
            maxLength={254}
            placeholder="persona@ejemplo.com"
            className={authInputClass}
          />
          <span className="text-muted mt-2 block text-xs leading-5">
            Si lo completás, solo esa cuenta podrá usar el enlace.
          </span>
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm font-medium">
            Rol
            <select
              name="role"
              defaultValue="member"
              className={authInputClass}
            >
              <option value="member">Miembro</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label className="block text-sm font-medium">
            Vence en
            <select
              name="expiresInDays"
              defaultValue="7"
              className={authInputClass}
            >
              <option value="1">1 día</option>
              <option value="3">3 días</option>
              <option value="7">7 días</option>
              <option value="14">14 días</option>
              <option value="30">30 días</option>
            </select>
          </label>
          <label className="block text-sm font-medium">
            Usos máximos
            <input
              name="maxUses"
              type="number"
              required
              min={1}
              max={25}
              defaultValue={1}
              className={authInputClass}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="bg-brand hover:bg-brand-strong inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white transition disabled:cursor-wait disabled:opacity-60"
        >
          <Send aria-hidden="true" className="size-4" />
          {pending ? "Creando enlace…" : "Crear invitación"}
        </button>
      </form>

      {state.message ? (
        <div
          role={state.status === "error" ? "alert" : "status"}
          className={`mt-5 rounded-2xl border p-4 text-sm leading-6 ${
            state.status === "error"
              ? "border-brand/30 bg-accent-soft text-brand-strong"
              : "border-dusk/25 bg-dusk/10"
          }`}
        >
          <p>{state.message}</p>
          {state.inviteUrl ? (
            <div className="mt-3 flex gap-2">
              <label className="sr-only" htmlFor="created-invite-url">
                Enlace de invitación creado
              </label>
              <input
                id="created-invite-url"
                value={state.inviteUrl}
                readOnly
                className="border-line min-w-0 flex-1 rounded-xl border bg-white px-3 py-2 font-mono text-xs"
              />
              <button
                type="button"
                onClick={copyInvite}
                className="bg-dusk inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white"
              >
                {copied ? (
                  <Check aria-hidden="true" className="size-4" />
                ) : (
                  <Copy aria-hidden="true" className="size-4" />
                )}
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-muted mt-5 flex items-start gap-2 text-xs leading-5">
          <Link2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          El token original aparece una sola vez. La base guarda únicamente su
          hash SHA-256.
        </p>
      )}
    </div>
  );
}
