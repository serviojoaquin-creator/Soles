export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl animate-pulse px-5 py-10 sm:px-8">
      <div className="bg-line h-4 w-28 rounded-full" />
      <div className="bg-line mt-4 h-12 w-72 max-w-full rounded-2xl" />
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="bg-line/70 h-44 rounded-3xl" />
        ))}
      </div>
      <span className="sr-only">Cargando</span>
    </div>
  );
}
