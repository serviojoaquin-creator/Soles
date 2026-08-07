import type { TripFeedback as TripFeedbackValue } from "@/features/trips/feedback";

export function TripFeedback({ feedback }: { feedback: TripFeedbackValue }) {
  const tone =
    feedback.kind === "error"
      ? "border-brand/30 bg-accent-soft text-brand-strong"
      : feedback.kind === "warning"
        ? "border-sun/50 bg-sun/10 text-foreground"
        : "border-dusk/25 bg-dusk/10 text-foreground";

  return (
    <p
      role={feedback.kind === "error" ? "alert" : "status"}
      className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${tone}`}
    >
      {feedback.message}
    </p>
  );
}
