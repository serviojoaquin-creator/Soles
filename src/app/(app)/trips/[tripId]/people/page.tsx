import {
  Crown,
  Link2,
  LogOut,
  Mail,
  Shield,
  UserMinus,
  UsersRound,
} from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { InviteForm } from "@/components/members/invite-form";
import { TripFeedback } from "@/components/trips/trip-feedback";
import { TripNav } from "@/components/trips/trip-nav";
import {
  leaveTripAction,
  removeMemberAction,
  revokeInviteAction,
  transferOwnershipAction,
  updateMemberRoleAction,
} from "@/features/members/actions";
import { getMemberFeedback } from "@/features/members/feedback";
import {
  canChangeMemberRole,
  canLeaveTrip,
  canManageInvites,
  canRemoveMember,
  canTransferOwnership,
} from "@/features/members/permissions";
import { getTripPeopleContext } from "@/features/members/server";
import { tripRoleLabels } from "@/features/trips/presentation";
import { tripIdSchema } from "@/features/trips/schemas";

export const metadata: Metadata = { title: "Participantes" };

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
});

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function inviteStatus(invite: {
  expires_at: string;
  max_uses: number;
  revoked_at: string | null;
  use_count: number;
}) {
  if (invite.revoked_at) return { label: "Revocada", tone: "bg-background" };
  if (invite.use_count >= invite.max_uses)
    return { label: "Agotada", tone: "bg-background" };
  if (new Date(invite.expires_at).getTime() <= Date.now())
    return { label: "Vencida", tone: "bg-background" };
  return { label: "Activa", tone: "bg-dusk/10 text-dusk" };
}

export default async function PeoplePage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ tripId }, query] = await Promise.all([params, searchParams]);
  if (!tripIdSchema.safeParse(tripId).success) {
    notFound();
  }

  const context = await getTripPeopleContext(tripId);
  if (!context) {
    notFound();
  }

  const { currentUserId, invites, members, role: actorRole, trip } = context;
  const feedback = getMemberFeedback(query);
  const isCompleted = trip.status === "completed";
  const managesInvites = canManageInvites(actorRole) && !isCompleted;

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
      <TripNav isCompleted={isCompleted} tripId={tripId} />

      <div className="mt-8">
        <p className="text-accent text-sm font-semibold">El grupo del viaje</p>
        <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
          Personas en {trip.name}
        </h1>
        <p className="text-muted mt-3 max-w-3xl leading-7">
          Cada rol tiene límites claros. El owner sigue protegido hasta que
          transfiera su responsabilidad mediante la operación segura.
        </p>
      </div>

      {feedback ? (
        <div className="mt-7 max-w-3xl">
          <TripFeedback feedback={feedback} />
        </div>
      ) : null}

      <div className="mt-9 grid gap-7 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="border-line bg-surface rounded-[2rem] border p-6 shadow-sm sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="bg-accent-soft text-brand grid size-11 shrink-0 place-items-center rounded-xl">
                <UsersRound aria-hidden="true" className="size-5" />
              </span>
              <div>
                <h2 className="text-xl font-semibold">Participantes</h2>
                <p className="text-muted mt-1 text-sm leading-6">
                  {members.length === 1
                    ? "1 persona forma parte del viaje."
                    : `${members.length} personas forman parte del viaje.`}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-7 space-y-4">
            {members.map((member) => {
              const isCurrentUser = member.userId === currentUserId;
              const canChange =
                !isCompleted &&
                canChangeMemberRole(
                  actorRole,
                  currentUserId,
                  member.role,
                  member.userId,
                );
              const canRemove =
                !isCompleted &&
                canRemoveMember(
                  actorRole,
                  currentUserId,
                  member.role,
                  member.userId,
                );
              const canTransfer =
                !isCompleted &&
                canTransferOwnership(
                  actorRole,
                  currentUserId,
                  member.role,
                  member.userId,
                );

              return (
                <section
                  key={member.userId}
                  className="border-line rounded-2xl border p-4 sm:p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="bg-accent-soft text-brand grid size-12 shrink-0 place-items-center overflow-hidden rounded-full font-semibold">
                      {member.avatarUrl ? (
                        // Signed private avatar URL expires after five minutes.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={member.avatarUrl}
                          alt={`Avatar de ${member.displayName}`}
                          className="size-full object-cover"
                        />
                      ) : (
                        initials(member.displayName)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{member.displayName}</h3>
                        {isCurrentUser ? (
                          <span className="text-muted text-xs">Vos</span>
                        ) : null}
                        <span className="bg-background inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold">
                          {member.role === "owner" ? (
                            <Crown aria-hidden="true" className="size-3" />
                          ) : (
                            <Shield aria-hidden="true" className="size-3" />
                          )}
                          {tripRoleLabels[member.role]}
                        </span>
                      </div>
                      <p className="text-muted mt-1 text-xs">
                        Se sumó el{" "}
                        {dateFormatter.format(new Date(member.joinedAt))}
                      </p>
                    </div>
                  </div>

                  {canChange || canTransfer || canRemove ? (
                    <div className="border-line mt-4 space-y-4 border-t pt-4">
                      {canChange ? (
                        <form
                          action={updateMemberRoleAction}
                          className="flex flex-col gap-2 sm:flex-row"
                        >
                          <input type="hidden" name="tripId" value={tripId} />
                          <input
                            type="hidden"
                            name="userId"
                            value={member.userId}
                          />
                          <label
                            className="sr-only"
                            htmlFor={`role-${member.userId}`}
                          >
                            Rol de {member.displayName}
                          </label>
                          <select
                            id={`role-${member.userId}`}
                            name="role"
                            defaultValue={member.role}
                            className="border-line h-11 flex-1 rounded-xl border bg-white px-3 text-sm"
                          >
                            <option value="member">Miembro</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button
                            type="submit"
                            className="bg-dusk hover:bg-foreground h-11 rounded-xl px-4 text-sm font-semibold text-white transition"
                          >
                            Guardar rol
                          </button>
                        </form>
                      ) : null}

                      {canTransfer ? (
                        <form
                          action={transferOwnershipAction}
                          className="bg-sun/10 rounded-xl p-4"
                        >
                          <input type="hidden" name="tripId" value={tripId} />
                          <input
                            type="hidden"
                            name="newOwnerId"
                            value={member.userId}
                          />
                          <p className="text-sm font-semibold">
                            Transferir ownership a {member.displayName}
                          </p>
                          <label className="mt-3 block text-xs font-medium">
                            Tu nuevo rol
                            <select
                              name="previousOwnerRole"
                              defaultValue="admin"
                              className="border-line mt-1 h-10 w-full rounded-lg border bg-white px-3 text-sm"
                            >
                              <option value="admin">Admin</option>
                              <option value="member">Miembro</option>
                            </select>
                          </label>
                          <label className="mt-3 flex items-start gap-2 text-xs leading-5">
                            <input
                              type="checkbox"
                              name="confirm"
                              value="yes"
                              required
                              className="mt-1"
                            />
                            Confirmo que esta persona pasará a controlar el
                            viaje.
                          </label>
                          <button
                            type="submit"
                            className="border-sun text-foreground hover:bg-sun/20 mt-3 h-10 w-full rounded-lg border px-3 text-xs font-semibold transition"
                          >
                            Transferir ownership
                          </button>
                        </form>
                      ) : null}

                      {canRemove ? (
                        <form action={removeMemberAction}>
                          <input type="hidden" name="tripId" value={tripId} />
                          <input
                            type="hidden"
                            name="userId"
                            value={member.userId}
                          />
                          <label className="flex items-start gap-2 text-xs leading-5">
                            <input
                              type="checkbox"
                              name="confirm"
                              value="yes"
                              required
                              className="mt-1"
                            />
                            Confirmo que quiero quitar a {member.displayName}{" "}
                            del viaje.
                          </label>
                          <button
                            type="submit"
                            className="border-brand/30 text-brand hover:bg-accent-soft mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold transition"
                          >
                            <UserMinus aria-hidden="true" className="size-4" />
                            Quitar del viaje
                          </button>
                        </form>
                      ) : null}
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>

          {!isCompleted && canLeaveTrip(actorRole) ? (
            <form
              action={leaveTripAction}
              className="border-line mt-7 border-t pt-6"
            >
              <input type="hidden" name="tripId" value={tripId} />
              <p className="text-muted text-sm leading-6">
                Podés salir del viaje cuando quieras. Tu contenido no se borra.
              </p>
              <button
                type="submit"
                className="border-line hover:bg-accent-soft mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition"
              >
                <LogOut aria-hidden="true" className="size-4" />
                Salir del viaje
              </button>
            </form>
          ) : null}
        </article>

        <div className="space-y-7">
          <article className="border-line bg-surface rounded-[2rem] border p-6 shadow-sm sm:p-7">
            <div className="flex items-start gap-3">
              <span className="bg-accent-soft text-brand grid size-11 shrink-0 place-items-center rounded-xl">
                <Link2 aria-hidden="true" className="size-5" />
              </span>
              <div>
                <h2 className="text-xl font-semibold">Nueva invitación</h2>
                <p className="text-muted mt-1 text-sm leading-6">
                  Enlaces seguros con vencimiento y límite de usos.
                </p>
              </div>
            </div>

            {isCompleted ? (
              <p className="border-line text-muted mt-6 rounded-xl border border-dashed p-4 text-sm leading-6">
                Este recuerdo es de solo lectura. El owner debe reabrirlo antes
                de crear invitaciones o cambiar participantes.
              </p>
            ) : managesInvites ? (
              <div className="mt-6">
                <InviteForm tripId={tripId} />
              </div>
            ) : (
              <p className="border-line text-muted mt-6 rounded-xl border border-dashed p-4 text-sm leading-6">
                Solo owner y admin pueden crear invitaciones.
              </p>
            )}
          </article>

          {managesInvites ? (
            <article className="border-line bg-surface rounded-[2rem] border p-6 shadow-sm sm:p-7">
              <h2 className="text-xl font-semibold">Invitaciones creadas</h2>
              <p className="text-muted mt-2 text-sm leading-6">
                Los tokens originales no se pueden volver a mostrar.
              </p>

              {invites.length > 0 ? (
                <div className="mt-5 space-y-3">
                  {invites.map((invite) => {
                    const status = inviteStatus(invite);
                    const canRevoke = status.label === "Activa";
                    return (
                      <div
                        key={invite.id}
                        className="border-line rounded-2xl border p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="flex items-center gap-2 text-sm font-semibold">
                              <Mail
                                aria-hidden="true"
                                className="size-4 shrink-0"
                              />
                              <span className="truncate">
                                {invite.invited_email ?? "Cualquier email"}
                              </span>
                            </p>
                            <p className="text-muted mt-2 text-xs leading-5">
                              {tripRoleLabels[invite.role]} · {invite.use_count}
                              /{invite.max_uses} usos · vence{" "}
                              {dateFormatter.format(
                                new Date(invite.expires_at),
                              )}
                            </p>
                          </div>
                          <span
                            className={`${status.tone} shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold`}
                          >
                            {status.label}
                          </span>
                        </div>
                        {canRevoke ? (
                          <form action={revokeInviteAction} className="mt-3">
                            <input type="hidden" name="tripId" value={tripId} />
                            <input
                              type="hidden"
                              name="inviteId"
                              value={invite.id}
                            />
                            <button
                              type="submit"
                              className="text-brand text-xs font-semibold underline-offset-4 hover:underline"
                            >
                              Revocar enlace
                            </button>
                          </form>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="border-line text-muted mt-5 rounded-xl border border-dashed p-4 text-sm">
                  Todavía no se crearon invitaciones.
                </p>
              )}
            </article>
          ) : null}
        </div>
      </div>
    </section>
  );
}
