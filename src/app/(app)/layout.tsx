import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/features/auth/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!hasSupabaseConfig()) {
    redirect("/login?error=configuration");
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?error=auth_required");
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const fallbackName = user.email?.split("@")[0] || "Viajero";

  return (
    <AppShell
      displayName={profile?.display_name ?? fallbackName}
      email={user.email ?? ""}
    >
      {children}
    </AppShell>
  );
}
