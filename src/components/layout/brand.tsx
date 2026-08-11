import Image from "next/image";
import Link from "next/link";

type BrandProps = {
  showName?: boolean;
  variant?: "default" | "inverse";
};

export function Brand({ showName = true, variant = "default" }: BrandProps) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-3 rounded-lg font-semibold tracking-tight ${
        variant === "inverse" ? "text-white" : "text-foreground"
      }`}
      aria-label="Soles, inicio"
    >
      <Image
        src="/soles-logo.webp"
        alt=""
        width={80}
        height={80}
        className="size-10 rounded-2xl shadow-sm"
      />
      {showName ? <span>Soles</span> : null}
    </Link>
  );
}
