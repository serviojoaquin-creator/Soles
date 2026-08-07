"use server";

import { revalidatePath } from "next/cache";
import type { Route } from "next";
import { redirect } from "next/navigation";

import { formValue, profileSchema } from "@/features/auth/schemas";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const avatarTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

function profileFeedback(kind: "error" | "message", code: string): Route {
  return `/profile?${kind}=${encodeURIComponent(code)}` as Route;
}

async function authenticatedClient() {
  if (!hasSupabaseConfig()) {
    redirect("/login?error=configuration");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?error=session_expired");
  }

  return { supabase, user };
}

function hasValidSignature(bytes: Uint8Array, type: keyof typeof avatarTypes) {
  if (type === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (type === "image/png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }

  return (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

export async function updateProfileAction(formData: FormData) {
  const parsed = profileSchema.safeParse({
    displayName: formValue(formData, "displayName"),
  });

  if (!parsed.success) {
    redirect(profileFeedback("error", "validation"));
  }

  const { supabase, user } = await authenticatedClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data.displayName })
    .eq("id", user.id);

  if (error) {
    redirect(profileFeedback("error", "update_failed"));
  }

  revalidatePath("/profile");
  redirect(profileFeedback("message", "profile_updated"));
}

export async function uploadAvatarAction(formData: FormData) {
  const { supabase, user } = await authenticatedClient();
  const avatar = formData.get("avatar");

  if (!(avatar instanceof File)) {
    redirect(profileFeedback("error", "avatar_invalid"));
  }

  const extension = avatarTypes[avatar.type as keyof typeof avatarTypes];
  if (!extension || avatar.size <= 0 || avatar.size > MAX_AVATAR_BYTES) {
    redirect(profileFeedback("error", "avatar_invalid"));
  }

  const bytes = new Uint8Array(await avatar.slice(0, 12).arrayBuffer());
  if (!hasValidSignature(bytes, avatar.type as keyof typeof avatarTypes)) {
    redirect(profileFeedback("error", "avatar_invalid"));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", user.id)
    .single();

  const objectPath = `${user.id}/avatar-${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(objectPath, avatar, {
      cacheControl: "3600",
      contentType: avatar.type,
      upsert: false,
    });

  if (uploadError) {
    redirect(profileFeedback("error", "update_failed"));
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_path: objectPath })
    .eq("id", user.id);

  if (profileError) {
    await supabase.storage.from(AVATAR_BUCKET).remove([objectPath]);
    redirect(profileFeedback("error", "update_failed"));
  }

  if (profile?.avatar_path) {
    await supabase.storage.from(AVATAR_BUCKET).remove([profile.avatar_path]);
  }

  revalidatePath("/profile");
  redirect(profileFeedback("message", "avatar_updated"));
}

export async function removeAvatarAction() {
  const { supabase, user } = await authenticatedClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", user.id)
    .single();

  if (!profile?.avatar_path) {
    redirect("/profile");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_path: null })
    .eq("id", user.id);

  if (error) {
    redirect(profileFeedback("error", "update_failed"));
  }

  await supabase.storage.from(AVATAR_BUCKET).remove([profile.avatar_path]);
  revalidatePath("/profile");
  redirect(profileFeedback("message", "avatar_updated"));
}
