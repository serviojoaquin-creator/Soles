"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";

import {
  forgotPasswordSchema,
  formValue,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/features/auth/schemas";
import {
  loginErrorFeedbackCode,
  recoveryErrorFeedbackCode,
  registerErrorFeedbackCode,
} from "@/features/auth/feedback";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { getSiteUrl, safeInternalPath } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

function feedbackPath(
  path: Route,
  kind: "error" | "message",
  code: string,
): Route {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${kind}=${encodeURIComponent(code)}` as Route;
}

function requireConfiguration(path: Route) {
  if (!hasSupabaseConfig()) {
    redirect(feedbackPath(path, "error", "configuration"));
  }
}

export async function loginAction(formData: FormData) {
  const nextPath = safeInternalPath(formValue(formData, "next"));
  const loginPath = `/login?next=${encodeURIComponent(nextPath)}` as Route;
  requireConfiguration(loginPath);

  const parsed = loginSchema.safeParse({
    email: formValue(formData, "email"),
    password: formValue(formData, "password"),
  });

  if (!parsed.success) {
    redirect(feedbackPath(loginPath, "error", "validation"));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    console.error("[auth:login] Supabase request failed", {
      code: error.code,
      status: error.status,
    });
    redirect(
      feedbackPath(loginPath, "error", loginErrorFeedbackCode(error.code)),
    );
  }

  redirect(nextPath as Route);
}

export async function registerAction(formData: FormData) {
  const nextPath = safeInternalPath(formValue(formData, "next"));
  const registerPath =
    `/register?next=${encodeURIComponent(nextPath)}` as Route;
  const loginPath = `/login?next=${encodeURIComponent(nextPath)}` as Route;
  requireConfiguration(registerPath);

  const parsed = registerSchema.safeParse({
    displayName: formValue(formData, "displayName"),
    email: formValue(formData, "email"),
    password: formValue(formData, "password"),
    confirmPassword: formValue(formData, "confirmPassword"),
  });

  if (!parsed.success) {
    redirect(feedbackPath(registerPath, "error", "validation"));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: `${getSiteUrl()}/auth/callback?next=${encodeURIComponent(nextPath)}`,
    },
  });

  if (error) {
    console.error("[auth:register] Supabase request failed", {
      code: error.code,
      status: error.status,
    });
    redirect(
      feedbackPath(
        registerPath,
        "error",
        registerErrorFeedbackCode(error.code),
      ),
    );
  }

  if (data.session) {
    redirect(nextPath as Route);
  }

  redirect(feedbackPath(loginPath, "message", "check_email"));
}

export async function forgotPasswordAction(formData: FormData) {
  requireConfiguration("/forgot-password");

  const parsed = forgotPasswordSchema.safeParse({
    email: formValue(formData, "email"),
  });

  if (!parsed.success) {
    redirect(feedbackPath("/forgot-password", "error", "validation"));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password`,
    },
  );

  if (error) {
    console.error("[auth:recovery] Supabase request failed", {
      code: error.code,
      status: error.status,
    });
    redirect(
      feedbackPath(
        "/forgot-password",
        "error",
        recoveryErrorFeedbackCode(error.code),
      ),
    );
  }

  redirect(feedbackPath("/forgot-password", "message", "recovery_sent"));
}

export async function updatePasswordAction(formData: FormData) {
  requireConfiguration("/reset-password");

  const parsed = resetPasswordSchema.safeParse({
    password: formValue(formData, "password"),
    confirmPassword: formValue(formData, "confirmPassword"),
  });

  if (!parsed.success) {
    redirect(feedbackPath("/reset-password", "error", "validation"));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(feedbackPath("/login", "error", "session_expired"));
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    redirect(feedbackPath("/reset-password", "error", "update_failed"));
  }

  redirect(feedbackPath("/profile", "message", "password_updated"));
}

export async function logoutAction() {
  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  redirect("/login");
}
