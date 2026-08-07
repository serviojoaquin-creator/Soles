export default function TripLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl animate-pulse px-5 py-8 sm:px-8 lg:px-12">
      <div className="bg-line h-12 rounded-2xl" />
      <div className="bg-line/80 mt-7 h-88 rounded-[2rem]" />
      <div className="mt-7 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="bg-line/70 h-80 rounded-3xl" />
        <div className="bg-line/70 h-64 rounded-3xl" />
      </div>
      <span className="sr-only">Cargando viaje</span>
    </div>
  );
}
