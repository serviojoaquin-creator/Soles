import { Camera, Mail, UserRound } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { authInputClass } from "@/components/ui/auth-card";
import { SubmitButton } from "@/components/ui/submit-button";
import { getFeedback } from "@/features/auth/feedback";
import { getCurrentUser } from "@/features/auth/server";
import {
  removeAvatarAction,
  updateProfileAction,
  uploadAvatarAction,
} from "@/features/profile/actions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mi perfil" };

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?error=auth_required");
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_path")
    .eq("id", user.id)
    .maybeSingle();

  const displayName =
    profile?.display_name ?? user.email?.split("@")[0] ?? "Viajero";
  const feedback = getFeedback(await searchParams);
  let avatarUrl: string | null = null;

  if (profile?.avatar_path) {
    const { data } = await supabase.storage
      .from("avatars")
      .createSignedUrl(profile.avatar_path, 300);
    avatarUrl = data?.signedUrl ?? null;
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
      <p className="text-accent text-sm font-semibold">Tu cuenta</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
        Tu perfil viajero
      </h1>
      <p className="text-muted mt-3 max-w-2xl leading-7">
        Este nombre y avatar serán visibles únicamente para las personas que
        compartan un viaje con vos.
      </p>

      {feedback ? (
        <p
          role={feedback.kind === "error" ? "alert" : "status"}
          className={`mt-6 max-w-2xl rounded-xl border px-4 py-3 text-sm ${
            feedback.kind === "error"
              ? "border-brand/30 bg-accent-soft text-brand-strong"
              : "border-sun/40 bg-sun/10"
          }`}
        >
          {feedback.message}
        </p>
      ) : null}

      <div className="mt-9 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <article className="border-line bg-surface rounded-3xl border p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-4">
            <div className="bg-accent-soft text-brand grid size-20 shrink-0 place-items-center overflow-hidden rounded-full text-xl font-semibold">
              {avatarUrl ? (
                // Signed private URLs are intentionally rendered directly and expire after five minutes.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={`Avatar de ${displayName}`}
                  className="size-full object-cover"
                />
              ) : (
                initials(displayName) || (
                  <UserRound aria-hidden="true" className="size-8" />
                )
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">{displayName}</p>
              <p className="text-muted mt-1 flex items-center gap-2 truncate text-sm">
                <Mail aria-hidden="true" className="size-4 shrink-0" />
                {user.email}
              </p>
            </div>
          </div>

          <form
            action={uploadAvatarAction}
            className="border-line mt-7 space-y-4 border-t pt-6"
          >
            <label className="block text-sm font-medium" htmlFor="avatar">
              Foto de perfil
            </label>
            <input
              id="avatar"
              name="avatar"
              type="file"
              required
              accept="image/jpeg,image/png,image/webp"
              className="border-line file:bg-accent-soft file:text-brand w-full rounded-xl border bg-white p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-2 file:font-semibold"
            />
            <p className="text-muted text-xs leading-5">
              JPEG, PNG o WebP. Máximo 2 MB. La imagen se guarda en un espacio
              privado.
            </p>
            <SubmitButton label="Subir avatar" pendingLabel="Subiendo…" />
          </form>

          {profile?.avatar_path ? (
            <form action={removeAvatarAction} className="mt-3">
              <button
                type="submit"
                className="border-line text-muted hover:bg-accent-soft h-11 w-full rounded-xl border px-4 text-sm font-semibold transition"
              >
                Quitar avatar
              </button>
            </form>
          ) : null}
        </article>

        <article className="border-line bg-surface rounded-3xl border p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-3">
            <div className="bg-accent-soft text-brand grid size-10 shrink-0 place-items-center rounded-xl">
              <Camera aria-hidden="true" className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Datos personales</h2>
              <p className="text-muted mt-1 text-sm leading-6">
                Podés cambiar cómo te identifica el grupo. El email pertenece a
                tu acceso y no se modifica desde acá.
              </p>
            </div>
          </div>

          <form action={updateProfileAction} className="mt-7 space-y-5">
            <label className="block text-sm font-medium">
              Nombre visible
              <input
                name="displayName"
                type="text"
                autoComplete="name"
                required
                minLength={1}
                maxLength={80}
                defaultValue={displayName}
                className={authInputClass}
              />
            </label>
            <label className="block text-sm font-medium">
              Email
              <input
                type="email"
                value={user.email ?? ""}
                readOnly
                aria-describedby="email-note"
                className={`${authInputClass} text-muted bg-background`}
              />
            </label>
            <p id="email-note" className="text-muted text-xs leading-5">
              El cambio de email requerirá un flujo de verificación
              independiente después del MVP.
            </p>
            <SubmitButton label="Guardar perfil" pendingLabel="Guardando…" />
          </form>
        </article>
      </div>
    </section>
  );
}
