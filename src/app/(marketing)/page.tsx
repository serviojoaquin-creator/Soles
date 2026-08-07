import {
  ArrowRight,
  CalendarDays,
  Camera,
  Check,
  MapPin,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

import { SiteHeader } from "@/components/layout/site-header";

const benefits = [
  {
    icon: CalendarDays,
    title: "Planifiquen juntos",
    description:
      "Organicá cada día y mantené horarios, lugares e ideas en un mismo itinerario.",
  },
  {
    icon: Camera,
    title: "Reúnan sus fotos",
    description:
      "Cada integrante aporta sus imágenes a un álbum privado del viaje.",
  },
  {
    icon: UsersRound,
    title: "Vuelvan cuando quieran",
    description:
      "El viaje terminado se convierte en una historia cronológica para todo el grupo.",
  },
] as const;

export default function HomePage() {
  return (
    <div className="bg-background min-h-screen overflow-hidden">
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className="relative mx-auto grid w-full max-w-7xl gap-14 px-5 pt-12 pb-20 sm:px-8 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-12 lg:pb-28">
          <div className="relative z-10">
            <h1 className="max-w-3xl font-serif text-5xl leading-[1.02] font-semibold tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              El viaje se termina.
              <span className="text-brand block">La historia queda.</span>
            </h1>
            <p className="text-muted mt-7 max-w-xl text-lg leading-8 sm:text-xl">
              Planifiquen en grupo, compartan cada foto y vuelvan a recorrer el
              viaje como un recuerdo privado.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="bg-brand hover:bg-brand-strong inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(142,49,39,0.24)] transition hover:-translate-y-0.5"
              >
                Crear mi primer viaje
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link
                href="/dashboard"
                className="border-line bg-surface inline-flex min-h-12 items-center justify-center rounded-full border px-6 text-sm font-semibold transition hover:bg-white"
              >
                Ver la experiencia
              </Link>
            </div>
            <ul className="text-muted mt-8 flex flex-wrap gap-x-5 gap-y-3 text-sm">
              {[
                "Privado por diseño",
                "Pensado para el celular",
                "Sin red social pública",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="bg-accent-soft text-brand grid size-5 place-items-center rounded-full">
                    <Check aria-hidden="true" className="size-3" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mx-auto w-full max-w-lg lg:mx-0 lg:ml-auto">
            <div
              aria-hidden="true"
              className="bg-accent-soft absolute -top-16 -left-20 size-56 rounded-full blur-2xl"
            />
            <div
              aria-hidden="true"
              className="absolute -right-14 -bottom-20 size-64 rounded-full bg-[#ddc4df] blur-2xl"
            />
            <div className="bg-surface-strong relative rotate-1 rounded-[2rem] border border-white/80 p-4 shadow-[0_30px_100px_rgba(64,35,58,0.16)] sm:p-5">
              <div className="bg-brand relative overflow-hidden rounded-[1.5rem] px-6 pt-32 pb-7 text-white sm:pt-40">
                <div className="absolute inset-0 opacity-95 [background:radial-gradient(circle_at_78%_18%,#ffd27d_0_9%,transparent_9.5%),radial-gradient(circle_at_14%_28%,#f88767_0_5%,transparent_5.5%),linear-gradient(145deg,#754263,#c85742,#f3a548)]" />
                <div className="absolute bottom-0 left-0 h-28 w-full bg-[#4d2b4b]/30 [clip-path:polygon(0_52%,20%_35%,39%_52%,59%_25%,78%_48%,100%_18%,100%_100%,0_100%)]" />
                <div className="relative">
                  <p className="text-xs font-semibold tracking-[0.18em] text-white/70 uppercase">
                    Próximo viaje
                  </p>
                  <h2 className="mt-2 font-serif text-3xl font-semibold">
                    Bariloche entre amigos
                  </h2>
                  <p className="mt-3 flex items-center gap-2 text-sm text-white/80">
                    <MapPin aria-hidden="true" className="size-4" />
                    Río Negro · 14 al 20 de septiembre
                  </p>
                </div>
              </div>
              <div className="grid gap-3 px-2 py-5 sm:grid-cols-2">
                <div className="bg-background rounded-2xl p-4">
                  <p className="text-muted text-xs font-semibold tracking-wider uppercase">
                    Hoy
                  </p>
                  <p className="mt-2 font-semibold">Circuito Chico</p>
                  <p className="text-muted mt-1 text-sm">
                    10:30 · 6 participantes
                  </p>
                </div>
                <div className="bg-accent-soft rounded-2xl p-4">
                  <p className="text-muted text-xs font-semibold tracking-wider uppercase">
                    Álbum
                  </p>
                  <p className="mt-2 font-semibold">Un lugar para todos</p>
                  <p className="text-muted mt-1 text-sm">
                    Fotos privadas del grupo
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-line bg-surface border-y">
          <div className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-14 sm:px-8 md:grid-cols-3 lg:px-12 lg:py-20">
            {benefits.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="border-line rounded-3xl border bg-white p-6"
              >
                <span className="bg-accent-soft text-brand grid size-11 place-items-center rounded-2xl">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <h2 className="mt-5 text-lg font-semibold">{title}</h2>
                <p className="text-muted mt-2 leading-7">{description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer className="text-muted mx-auto flex w-full max-w-7xl flex-col gap-3 px-5 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <p>Soles · Historias compartidas, recuerdos privados.</p>
        <p>Diseñado para viajar juntos.</p>
      </footer>
    </div>
  );
}
