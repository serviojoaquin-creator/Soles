import type { Route } from "next";

import { ActiveNavLink } from "@/components/layout/active-nav-link";

export function TripNav({
  isCompleted = false,
  tripId,
}: {
  isCompleted?: boolean;
  tripId: string;
}) {
  const items: Array<{ href: Route; label: string }> = [
    { href: `/trips/${tripId}` as Route, label: "Resumen" },
    { href: `/trips/${tripId}/itinerary` as Route, label: "Itinerario" },
    { href: `/trips/${tripId}/album` as Route, label: "Álbum" },
    { href: `/trips/${tripId}/people` as Route, label: "Personas" },
    ...(isCompleted
      ? [{ href: `/trips/${tripId}/memory` as Route, label: "Recuerdo" }]
      : []),
    { href: `/trips/${tripId}/settings` as Route, label: "Configurar" },
  ];

  return (
    <nav
      aria-label="Secciones del viaje"
      className="border-line flex gap-1 overflow-x-auto border-b pb-1"
    >
      {items.map((item) => (
        <ActiveNavLink
          key={item.href}
          href={item.href}
          activeClassName="bg-accent-soft text-brand-strong"
          className="hover:bg-accent-soft shrink-0 rounded-t-xl px-4 py-3 text-sm font-semibold transition"
        >
          {item.label}
        </ActiveNavLink>
      ))}
    </nav>
  );
}
