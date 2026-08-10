"use server";

import { revalidatePath } from "next/cache";
import type { Route } from "next";
import { redirect } from "next/navigation";

import {
  canChangeMemberRole,
  canLeaveTrip,
  canManageInvites,
  canRemoveMember,
  canTransferOwnership,
} from "@/features/members/permissions";
import {
  createInviteSchema,
  inviteTokenSchema,
  leaveTripSchema,
  memberFormValue,
  removeMemberSchema,
  revokeInviteSchema,
  transferOwnershipSchema,
  updateMemberRoleSchema,
} from "@/features/members/schemas";
import {
  generateInviteToken,
  hashInviteToken,
} from "@/features/members/tokens";
import type { TripRole } from "@/features/trips/permissions";
import {
  getTripMutationAccess,
  tripAcceptsContentWrites,
} from "@/features/trips/mutation-access";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { getSiteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type CreateInviteState = {
  inviteUrl?: string;
  message?: string;
  status: "idle" | "error" | "success";
};

function membersPath(
  tripId: string,
  kind: "error" | "message",
  code: string,
): Route {
  return `/trips/${tripId}/people?${kind}=${encodeURIComponent(code)}` as Route;
}

async function authenticatedActor() {
  if (!hasSupabaseConfig()) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ? { supabase, user } : null;
}

async function requireActor() {
  const actor = await authenticatedActor();
  if (!actor) {
    redirect("/login?error=session_expired");
  }
  return actor;
}

async function membershipRole(
  supabase: SupabaseClient,
  tripId: string,
  userId: string,
): Promise<TripRole | null> {
  const { data } = await supabase
    .from("trip_members")
    .select("role")
    .eq("trip_id", tripId)
    .eq("user_id", userId)
    .maybeSingle();
  return data?.role ?? null;
}

async function membershipAccess(
  supabase: SupabaseClient,
  tripId: string,
  userId: string,
) {
  return getTripMutationAccess(supabase, userId, tripId);
}

export async function createInviteAction(
  _previousState: CreateInviteState,
  formData: FormData,
): Promise<CreateInviteState> {
  const parsed = createInviteSchema.safeParse({
    tripId: memberFormValue(formData, "tripId"),
    role: memberFormValue(formData, "role"),
    invitedEmail: memberFormValue(formData, "invitedEmail"),
    expiresInDays: memberFormValue(formData, "expiresInDays"),
    maxUses: memberFormValue(formData, "maxUses"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisá el email, el rol, el vencimiento y el límite de usos.",
    };
  }

  const actor = await authenticatedActor();
  if (!actor) {
    return { status: "error", message: "Tu sesión venció. Volvé a ingresar." };
  }

  const access = await membershipAccess(
    actor.supabase,
    parsed.data.tripId,
    actor.user.id,
  );
  if (!access || !canManageInvites(access.role)) {
    return { status: "error", message: "No tenés permisos para invitar." };
  }
  if (!tripAcceptsContentWrites(access)) {
    return {
      status: "error",
      message: "El recuerdo debe reabrirse antes de crear invitaciones.",
    };
  }

  const token = generateInviteToken();
  const tokenHash = hashInviteToken(token);
  const expiresAt = new Date(
    Date.now() + Number(parsed.data.expiresInDays) * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { error } = await actor.supabase.rpc("create_trip_invite", {
    p_trip_id: parsed.data.tripId,
    p_token_hash: tokenHash,
    p_expires_at: expiresAt,
    p_role: parsed.data.role,
    p_invited_email: parsed.data.invitedEmail || null,
    p_max_uses: parsed.data.maxUses,
  });

  if (error) {
    return {
      status: "error",
      message: "No pudimos crear la invitación. Intentá nuevamente.",
    };
  }

  revalidatePath(`/trips/${parsed.data.tripId}/people`);
  return {
    status: "success",
    message:
      "Enlace creado. Copialo ahora: por seguridad, Soles no guarda el token original.",
    inviteUrl: `${getSiteUrl()}/invite/${token}`,
  };
}

export async function acceptTripInviteAction(formData: FormData) {
  const token = memberFormValue(formData, "token");
  const parsed = inviteTokenSchema.safeParse(token);
  const invitePath = `/invite/${token}` as Route;

  if (!parsed.success) {
    redirect("/login?error=validation");
  }

  const actor = await authenticatedActor();
  if (!actor) {
    redirect(`/login?next=${encodeURIComponent(invitePath)}` as Route);
  }

  const { data: tripId, error } = await actor.supabase.rpc(
    "accept_trip_invite",
    { p_token_hash: hashInviteToken(parsed.data) },
  );

  if (error || !tripId) {
    redirect(`${invitePath}?error=invite_unavailable` as Route);
  }

  revalidatePath("/dashboard");
  redirect(`/trips/${tripId}?message=invite_accepted` as Route);
}

export async function revokeInviteAction(formData: FormData) {
  const parsed = revokeInviteSchema.safeParse({
    tripId: memberFormValue(formData, "tripId"),
    inviteId: memberFormValue(formData, "inviteId"),
  });
  if (!parsed.success) {
    redirect("/dashboard?error=members_invalid");
  }

  const { supabase, user } = await requireActor();
  const access = await membershipAccess(supabase, parsed.data.tripId, user.id);
  if (!access || !canManageInvites(access.role)) {
    redirect(membersPath(parsed.data.tripId, "error", "members_forbidden"));
  }
  if (!tripAcceptsContentWrites(access)) {
    redirect(membersPath(parsed.data.tripId, "error", "members_read_only"));
  }

  const { data: invite } = await supabase
    .from("trip_invites")
    .select("revoked_at")
    .eq("id", parsed.data.inviteId)
    .eq("trip_id", parsed.data.tripId)
    .maybeSingle();

  if (!invite) {
    redirect(membersPath(parsed.data.tripId, "error", "members_unavailable"));
  }

  if (!invite.revoked_at) {
    const { data, error } = await supabase
      .from("trip_invites")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", parsed.data.inviteId)
      .eq("trip_id", parsed.data.tripId)
      .select("id")
      .maybeSingle();
    if (error || !data) {
      redirect(membersPath(parsed.data.tripId, "error", "members_unavailable"));
    }
  }

  revalidatePath(`/trips/${parsed.data.tripId}/people`);
  redirect(membersPath(parsed.data.tripId, "message", "invite_revoked"));
}

export async function updateMemberRoleAction(formData: FormData) {
  const parsed = updateMemberRoleSchema.safeParse({
    tripId: memberFormValue(formData, "tripId"),
    userId: memberFormValue(formData, "userId"),
    role: memberFormValue(formData, "role"),
  });
  if (!parsed.success) {
    redirect("/dashboard?error=members_invalid");
  }

  const { supabase, user } = await requireActor();
  const [actorAccess, targetRole] = await Promise.all([
    membershipAccess(supabase, parsed.data.tripId, user.id),
    membershipRole(supabase, parsed.data.tripId, parsed.data.userId),
  ]);
  if (
    !actorAccess ||
    !targetRole ||
    !canChangeMemberRole(
      actorAccess.role,
      user.id,
      targetRole,
      parsed.data.userId,
    )
  ) {
    redirect(membersPath(parsed.data.tripId, "error", "members_forbidden"));
  }
  if (!tripAcceptsContentWrites(actorAccess)) {
    redirect(membersPath(parsed.data.tripId, "error", "members_read_only"));
  }

  const { data, error } = await supabase
    .from("trip_members")
    .update({ role: parsed.data.role })
    .eq("trip_id", parsed.data.tripId)
    .eq("user_id", parsed.data.userId)
    .select("user_id")
    .maybeSingle();
  if (error || !data) {
    redirect(membersPath(parsed.data.tripId, "error", "members_unavailable"));
  }

  revalidatePath(`/trips/${parsed.data.tripId}/people`);
  redirect(membersPath(parsed.data.tripId, "message", "member_role_updated"));
}

export async function removeMemberAction(formData: FormData) {
  const parsed = removeMemberSchema.safeParse({
    tripId: memberFormValue(formData, "tripId"),
    userId: memberFormValue(formData, "userId"),
    confirm: memberFormValue(formData, "confirm"),
  });
  if (!parsed.success) {
    redirect("/dashboard?error=members_invalid");
  }

  const { supabase, user } = await requireActor();
  const [actorAccess, targetRole] = await Promise.all([
    membershipAccess(supabase, parsed.data.tripId, user.id),
    membershipRole(supabase, parsed.data.tripId, parsed.data.userId),
  ]);
  if (
    !actorAccess ||
    !targetRole ||
    !canRemoveMember(actorAccess.role, user.id, targetRole, parsed.data.userId)
  ) {
    redirect(membersPath(parsed.data.tripId, "error", "members_forbidden"));
  }
  if (!tripAcceptsContentWrites(actorAccess)) {
    redirect(membersPath(parsed.data.tripId, "error", "members_read_only"));
  }

  const { data, error } = await supabase
    .from("trip_members")
    .delete()
    .eq("trip_id", parsed.data.tripId)
    .eq("user_id", parsed.data.userId)
    .select("user_id")
    .maybeSingle();
  if (error || !data) {
    redirect(membersPath(parsed.data.tripId, "error", "members_unavailable"));
  }

  revalidatePath(`/trips/${parsed.data.tripId}/people`);
  revalidatePath("/dashboard");
  redirect(membersPath(parsed.data.tripId, "message", "member_removed"));
}

export async function leaveTripAction(formData: FormData) {
  const parsed = leaveTripSchema.safeParse({
    tripId: memberFormValue(formData, "tripId"),
  });
  if (!parsed.success) {
    redirect("/dashboard?error=members_invalid");
  }

  const { supabase, user } = await requireActor();
  const access = await membershipAccess(supabase, parsed.data.tripId, user.id);
  if (!access || !canLeaveTrip(access.role)) {
    redirect(membersPath(parsed.data.tripId, "error", "members_forbidden"));
  }
  if (!tripAcceptsContentWrites(access)) {
    redirect(membersPath(parsed.data.tripId, "error", "members_read_only"));
  }

  const { data, error } = await supabase
    .from("trip_members")
    .delete()
    .eq("trip_id", parsed.data.tripId)
    .eq("user_id", user.id)
    .select("user_id")
    .maybeSingle();
  if (error || !data) {
    redirect(membersPath(parsed.data.tripId, "error", "members_unavailable"));
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?message=left_trip");
}

export async function transferOwnershipAction(formData: FormData) {
  const parsed = transferOwnershipSchema.safeParse({
    tripId: memberFormValue(formData, "tripId"),
    newOwnerId: memberFormValue(formData, "newOwnerId"),
    previousOwnerRole: memberFormValue(formData, "previousOwnerRole"),
    confirm: memberFormValue(formData, "confirm"),
  });
  if (!parsed.success) {
    redirect("/dashboard?error=members_invalid");
  }

  const { supabase, user } = await requireActor();
  const [actorAccess, targetRole] = await Promise.all([
    membershipAccess(supabase, parsed.data.tripId, user.id),
    membershipRole(supabase, parsed.data.tripId, parsed.data.newOwnerId),
  ]);
  if (
    !actorAccess ||
    !targetRole ||
    !canTransferOwnership(
      actorAccess.role,
      user.id,
      targetRole,
      parsed.data.newOwnerId,
    )
  ) {
    redirect(membersPath(parsed.data.tripId, "error", "members_forbidden"));
  }
  if (!tripAcceptsContentWrites(actorAccess)) {
    redirect(membersPath(parsed.data.tripId, "error", "members_read_only"));
  }

  const { error } = await supabase.rpc("transfer_trip_ownership", {
    p_trip_id: parsed.data.tripId,
    p_new_owner_id: parsed.data.newOwnerId,
    p_previous_owner_role: parsed.data.previousOwnerRole,
  });
  if (error) {
    redirect(membersPath(parsed.data.tripId, "error", "members_unavailable"));
  }

  revalidatePath(`/trips/${parsed.data.tripId}/people`);
  revalidatePath(`/trips/${parsed.data.tripId}`);
  redirect(membersPath(parsed.data.tripId, "message", "ownership_transferred"));
}
