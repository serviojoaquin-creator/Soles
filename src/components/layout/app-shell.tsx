import { CircleUserRound, LayoutDashboard, LogOut, Plus } from "lucide-react";
import Link from "next/link";

import { ActiveNavLink } from "@/components/layout/active-nav-link";
import { Brand } from "@/components/layout/brand";
import { logoutAction } from "@/features/auth/actions";
import { appNavigation } from "@/lib/navigation";

export function AppShell({
  children,
  displayName,
  email,
}: {
  children: React.ReactNode;
  displayName: string;
  email: string;
}) {
  return (
    <div className="bg-background min-h-screen lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="border-line bg-surface hidden border-r px-6 py-7 lg:flex lg:flex-col">
        <Brand />
        <nav aria-label="Navegación de la cuenta" className="mt-10 space-y-2">
          {appNavigation.map((item) => {
            const Icon =
              item.href === "/dashboard" ? LayoutDashboard : CircleUserRound;

            return (
              <ActiveNavLink
                key={item.href}
                href={item.href}
                activeClassName="bg-accent-soft text-brand-strong"
                className="hover:bg-accent-soft flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition"
              >
                <Icon aria-hidden="true" className="size-5" />
                {item.label}
              </ActiveNavLink>
            );
          })}
        </nav>
        <Link
          href="/trips/new"
          className="bg-brand hover:bg-brand-strong mt-6 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition"
        >
          <Plus aria-hidden="true" className="size-4" />
          Nuevo viaje
        </Link>
        <div className="border-line mt-auto border-t pt-5">
          <p className="truncate text-sm font-semibold">{displayName}</p>
          <p className="text-muted mt-1 truncate text-xs">{email}</p>
          <form action={logoutAction} className="mt-4">
            <button
              type="submit"
              className="text-muted hover:bg-accent-soft hover:text-foreground flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition"
            >
              <LogOut aria-hidden="true" className="size-4" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 pb-24 lg:pb-0">
        <header className="border-line bg-surface/90 flex items-center justify-between border-b px-5 py-4 backdrop-blur lg:hidden">
          <Brand />
          <div className="flex items-center gap-2">
            <form action={logoutAction}>
              <button
                type="submit"
                aria-label="Cerrar sesión"
                className="border-line text-muted grid size-10 place-items-center rounded-full border bg-white"
              >
                <LogOut aria-hidden="true" className="size-4" />
              </button>
            </form>
            <Link
              href="/trips/new"
              aria-label="Crear un viaje"
              className="bg-brand grid size-10 place-items-center rounded-full text-white"
            >
              <Plus aria-hidden="true" className="size-5" />
            </Link>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>

      <nav
        aria-label="Navegación móvil"
        className="border-line bg-surface/95 fixed inset-x-0 bottom-0 z-20 grid grid-cols-2 border-t px-4 py-2 backdrop-blur lg:hidden"
      >
        {appNavigation.map((item) => {
          const Icon =
            item.href === "/dashboard" ? LayoutDashboard : CircleUserRound;

          return (
            <ActiveNavLink
              key={item.href}
              href={item.href}
              activeClassName="bg-accent-soft text-brand-strong"
              className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium"
            >
              <Icon aria-hidden="true" className="size-5" />
              {item.label}
            </ActiveNavLink>
          );
        })}
      </nav>
    </div>
  );
}
