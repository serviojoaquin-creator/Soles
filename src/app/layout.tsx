import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Soles",
    template: "%s | Soles",
  },
  description:
    "Planificá viajes en grupo y conservá cada historia como un recuerdo privado.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-AR" data-scroll-behavior="smooth">
      <body>
        <a
          href="#main-content"
          className="bg-foreground fixed -top-20 left-3 z-50 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all focus:top-3"
        >
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
