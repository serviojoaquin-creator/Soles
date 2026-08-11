import Link from "next/link";

import { Brand } from "@/components/layout/brand";

export function SiteHeader() {
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
      <Brand showName={false} variant="inverse" />
      <nav
        aria-label="Navegación principal"
        className="flex items-center gap-2"
      >
        <Link
          href="/login"
          className="rounded-full px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
        >
          Ingresar
        </Link>
        <Link
          href="/register"
          className="bg-brand hover:bg-brand-strong rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition"
        >
          Crear cuenta
        </Link>
      </nav>
    </header>
  );
}
