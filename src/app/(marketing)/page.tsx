import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { SiteHeader } from "@/components/layout/site-header";

export default function HomePage() {
  return (
    <div className="bg-background min-h-screen overflow-hidden">
      <div className="relative isolate min-h-screen overflow-hidden bg-[#251d3a] text-white">
        <Image
          src="/soles-hero.webp"
          alt="Montañas iluminadas por un atardecer"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[62%_center]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,13,31,0.6)_0%,rgba(31,16,43,0.24)_35%,rgba(20,10,30,0.7)_100%)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(20,10,30,0.22)_100%)]"
        />

        <SiteHeader />
        <main
          id="main-content"
          tabIndex={-1}
          className="relative z-10 flex min-h-[calc(100vh-84px)] items-center justify-center px-5 pb-20 sm:px-8 lg:px-12"
        >
          <section className="flex w-full max-w-4xl flex-col items-center text-center">
            <h1 className="max-w-3xl font-serif text-5xl leading-[1.02] font-semibold tracking-[-0.04em] text-white drop-shadow-[0_4px_20px_rgba(17,7,30,0.62)] sm:text-6xl lg:text-7xl">
              El viaje se termina.
              <span className="block text-[#ffd982]">La historia queda.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/90 drop-shadow-[0_2px_12px_rgba(17,7,30,0.56)] sm:text-xl">
              Planifiquen en grupo, compartan cada foto y vuelvan a recorrer el
              viaje como un recuerdo privado.
            </p>
            <div className="mt-9 flex w-full max-w-md flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
              <Link
                href="/register"
                className="bg-brand hover:bg-brand-strong inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(24,8,25,0.4)] transition hover:-translate-y-0.5"
              >
                Crear mi primer viaje
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/50 bg-white/15 px-6 text-sm font-semibold text-white shadow-sm backdrop-blur-sm transition hover:bg-white/25"
              >
                Ver la experiencia
              </Link>
            </div>
          </section>
        </main>
        <footer className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-3 px-5 py-7 text-center text-sm text-white/75 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:text-left lg:px-12">
          <p>Soles · Historias compartidas, recuerdos privados.</p>
          <p>Diseñado para viajar juntos.</p>
        </footer>
      </div>
    </div>
  );
}
