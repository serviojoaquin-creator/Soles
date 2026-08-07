"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

type ActiveNavLinkProps = {
  activeClassName: string;
  children: React.ReactNode;
  className: string;
  href: Route;
};

export function ActiveNavLink({
  activeClassName,
  children,
  className,
  href,
}: ActiveNavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`${className} ${isActive ? activeClassName : ""}`}
    >
      {children}
    </Link>
  );
}
