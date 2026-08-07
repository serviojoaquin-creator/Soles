import type { Route } from "next";
import Link from "next/link";

import type { Feedback } from "@/features/auth/feedback";

export const authInputClass =
  "border-line focus:border-accent mt-2 h-12 w-full rounded-xl border bg-white px-4 text-sm transition disabled:cursor-not-allowed disabled:opacity-60";

export function AuthCard({
  title,
  description,
  feedback,
  children,
  alternateLabel,
  alternateHref,
  alternateAction,
}: {
  title: string;
  description: string;
  feedback?: Feedback | null;
  children: React.ReactNode;
  alternateLabel?: string;
  alternateHref?: Route;
  alternateAction?: string;
}) {
  return (
    <div className="border-line bg-surface w-full max-w-md rounded-3xl border p-7 shadow-[0_24px_80px_rgba(64,35,58,0.1)] sm:p-9">
      <p className="text-accent text-sm font-semibold">
        Tu historia empieza acá
      </p>
      <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight">
        {title}
      </h1>
      <p className="text-muted mt-3 leading-7">{description}</p>

      {feedback ? (
        <p
          role={feedback.kind === "error" ? "alert" : "status"}
          className={`mt-6 rounded-xl border px-4 py-3 text-sm leading-6 ${
            feedback.kind === "error"
              ? "border-brand/30 bg-accent-soft text-brand-strong"
              : "border-sun/40 bg-sun/10 text-foreground"
          }`}
        >
          {feedback.message}
        </p>
      ) : null}

      <div className="mt-8">{children}</div>

      {alternateLabel && alternateHref && alternateAction ? (
        <p className="border-line text-muted mt-7 border-t pt-6 text-sm">
          {alternateLabel}{" "}
          <Link
            href={alternateHref}
            className="text-brand font-semibold underline-offset-4 hover:underline"
          >
            {alternateAction}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
