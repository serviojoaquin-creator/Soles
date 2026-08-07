"use client";

import { RotateCcw } from "lucide-react";

export default function AccountError({ reset }: { reset: () => void }) {
  return (
    <section className="mx-auto grid min-h-[65vh] w-full max-w-3xl place-items-center px-5 py-12 text-center">
      <div className="border-line bg-surface w-full rounded-[2rem] border p-8 shadow-sm sm:p-12">
        <p className="text-accent text-sm font-semibold">
          Algo interrumpió el viaje
        </p>
        <h1 className="mt-3 font-serif text-4xl font-semibold">
          No pudimos cargar esta información
        </h1>
        <p className="text-muted mx-auto mt-4 max-w-lg leading-7">
          Puede ser una conexión momentánea. Reintentá sin perder los cambios
          que ya se guardaron.
        </p>
        <button
          type="button"
          onClick={reset}
          className="bg-brand hover:bg-brand-strong mt-7 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition"
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          Intentar nuevamente
        </button>
      </div>
    </section>
  );
}
