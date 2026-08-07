import Link from "next/link";

export default function NotFound() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="grid min-h-screen place-items-center px-5 text-center"
    >
      <div>
        <p className="text-accent text-sm font-semibold">404</p>
        <h1 className="mt-3 font-serif text-5xl font-semibold">
          Este camino no está en el itinerario
        </h1>
        <p className="text-muted mx-auto mt-4 max-w-lg leading-7">
          La página no existe o ya no está disponible.
        </p>
        <Link
          href="/"
          className="bg-brand mt-7 inline-flex rounded-full px-6 py-3 text-sm font-semibold text-white"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
