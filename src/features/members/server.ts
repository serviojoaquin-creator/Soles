import "server-only";

import { getCurrentUser } from "@/features/auth/server";
import { canManageInvites } from "@/features/members/permissions";
import type { TripRole } from "@/features/trips/permissions";
import { getTripContext, type TripContext } from "@/features/trips/server";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

type MemberWithProfile = {
  joined_at: string;
  role: TripRole;
  user_id: string;
  profiles: Pick<Tables<"profiles">, "avatar_path" | "display_name">;
};

export type TripMemberView = {
  avatarUrl: string | null;
  displayName: string;
  joinedAt: string;
  role: TripRole;
  userId: string;
};

export type TripPeopleContext = TripContext & {
  currentUserId: string;
  invites: Tables<"trip_invites">[];
  members: TripMemberView[];
};

export async function getTripPeopleContext(
  tripId: string,
): Promise<TripPeopleContext | null> {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const tripContext = await getTripContext(tripId);
  if (!tripContext) {
    return null;
  }

  const supabase = await createClient();
  const membersResult = await supabase
    .from("trip_members")
    .select(
      "joined_at, role, user_id, profiles!inner(display_name, avatar_path)",
    )
    .eq("trip_id", tripId)
    .order("joined_at", { ascending: true });

  if (membersResult.error) {
    throw new Error("Unable to load trip members.");
  }

  const memberRows = (membersResult.data ??
    []) as unknown as MemberWithProfile[];
  const members = await Promise.all(
    memberRows.map(async (member) => {
      let avatarUrl: string | null = null;
      if (member.profiles.avatar_path) {
        const { data } = await supabase.storage
          .from("avatars")
          .createSignedUrl(member.profiles.avatar_path, 300);
        avatarUrl = data?.signedUrl ?? null;
      }

      return {
        avatarUrl,
        displayName: member.profiles.display_name,
        joinedAt: member.joined_at,
        role: member.role,
        userId: member.user_id,
      };
    }),
  );

  let invites: Tables<"trip_invites">[] = [];
  if (canManageInvites(tripContext.role)) {
    const invitesResult = await supabase
      .from("trip_invites")
      .select("*")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false });

    if (invitesResult.error) {
      throw new Error("Unable to load trip invitations.");
    }

    invites = invitesResult.data ?? [];
  }

  return {
    ...tripContext,
    currentUserId: user.id,
    invites,
    members,
  };
}
