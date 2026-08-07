import Link from "next/link";

export function Brand() {
  return (
    <Link
      href="/"
      className="text-foreground inline-flex items-center gap-3 rounded-lg font-semibold tracking-tight"
      aria-label="Soles, inicio"
    >
      <span
        aria-hidden="true"
        className="grid size-10 place-items-center rounded-2xl text-sm font-bold text-white shadow-sm [background:linear-gradient(145deg,var(--sun),var(--accent),var(--dusk))]"
      >
        S
      </span>
      <span>Soles</span>
    </Link>
  );
}
