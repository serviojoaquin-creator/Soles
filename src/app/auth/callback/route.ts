import { type NextRequest, NextResponse } from "next/server";

import { hasSupabaseConfig } from "@/lib/supabase/config";
import { safeInternalPath } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = safeInternalPath(requestUrl.searchParams.get("next"));

  if (!hasSupabaseConfig()) {
    return NextResponse.redirect(
      new URL("/login?error=configuration", requestUrl.origin),
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=callback_failed", requestUrl.origin),
  );
}
