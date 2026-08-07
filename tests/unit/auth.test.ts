import { describe, expect, it } from "vitest";

import {
  getFeedback,
  loginErrorFeedbackCode,
  recoveryErrorFeedbackCode,
  registerErrorFeedbackCode,
} from "@/features/auth/feedback";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/features/auth/schemas";
import { safeInternalPath } from "@/lib/site-url";

describe("authentication validation", () => {
  it("normalizes emails before sending them to Supabase", () => {
    const result = loginSchema.parse({
      email: "  VIAJERA@EXAMPLE.COM ",
      password: "una-contraseña-segura",
    });

    expect(result.email).toBe("viajera@example.com");
  });

  it("rejects registration when passwords differ", () => {
    const result = registerSchema.safeParse({
      displayName: "Luna",
      email: "luna@example.com",
      password: "segura-123",
      confirmPassword: "distinta-123",
    });

    expect(result.success).toBe(false);
  });

  it("enforces a minimum password length during recovery", () => {
    const result = resetPasswordSchema.safeParse({
      password: "corta",
      confirmPassword: "corta",
    });

    expect(result.success).toBe(false);
  });

  it("validates recovery email addresses", () => {
    expect(
      forgotPasswordSchema.safeParse({ email: "incorrecto" }).success,
    ).toBe(false);
  });
});

describe("authentication redirects and feedback", () => {
  it("accepts only same-origin relative destinations", () => {
    expect(safeInternalPath("/reset-password?from=email")).toBe(
      "/reset-password?from=email",
    );
    expect(safeInternalPath("//malicious.example/path")).toBe("/dashboard");
    expect(safeInternalPath("https://malicious.example/path")).toBe(
      "/dashboard",
    );
    expect(
      safeInternalPath("/invite/8Fh8cK08GvFjI99fYv1aqhNqZKq9p8uXHj4KjfmY2_U"),
    ).toBe("/invite/8Fh8cK08GvFjI99fYv1aqhNqZKq9p8uXHj4KjfmY2_U");
  });

  it("maps known feedback codes without reflecting arbitrary text", () => {
    expect(getFeedback({ error: "invalid_credentials" })).toEqual({
      kind: "error",
      message: "El email o la contraseña no son correctos.",
    });
    expect(getFeedback({ error: "<script>alert(1)</script>" })).toBeNull();
  });

  it("explains when login requires email confirmation", () => {
    expect(loginErrorFeedbackCode("email_not_confirmed")).toBe(
      "email_not_confirmed",
    );
    expect(getFeedback({ error: "email_not_confirmed" })?.message).toContain(
      "confirmá tu email",
    );
  });

  it("maps safe registration failures without exposing raw provider errors", () => {
    expect(registerErrorFeedbackCode("signup_disabled")).toBe(
      "signup_disabled",
    );
    expect(registerErrorFeedbackCode("over_email_send_rate_limit")).toBe(
      "signup_rate_limit",
    );
    expect(registerErrorFeedbackCode("email_address_not_authorized")).toBe(
      "email_not_authorized",
    );
    expect(registerErrorFeedbackCode("unknown_internal_error")).toBe(
      "register_failed",
    );
  });

  it("explains temporary recovery limits without exposing account existence", () => {
    expect(recoveryErrorFeedbackCode("over_email_send_rate_limit")).toBe(
      "recovery_rate_limit",
    );
    expect(recoveryErrorFeedbackCode("unknown_internal_error")).toBe(
      "recovery_unavailable",
    );
    expect(getFeedback({ error: "recovery_rate_limit" })?.message).toContain(
      "demasiados intentos",
    );
  });
});
