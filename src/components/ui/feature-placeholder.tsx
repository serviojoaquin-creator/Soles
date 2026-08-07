import { Construction } from "lucide-react";

export function FeaturePlaceholder({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 lg:py-14">
      <div className="border-line bg-surface rounded-3xl border p-7 shadow-[0_18px_60px_rgba(64,35,58,0.07)] sm:p-10">
        <span className="bg-accent-soft text-foreground inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold tracking-[0.16em] uppercase">
          <Construction aria-hidden="true" className="size-4" />
          {eyebrow}
        </span>
        <h1 className="mt-5 max-w-2xl font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
          {title}
        </h1>
        <p className="text-muted mt-4 max-w-2xl text-base leading-7 sm:text-lg">
          {description}
        </p>
      </div>
    </section>
  );
}
