import { Brand } from "@/components/layout/brand";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="grid min-h-screen place-items-center px-5 py-10"
    >
      <div className="absolute top-5 left-5 sm:top-7 sm:left-8">
        <Brand />
      </div>
      {children}
    </main>
  );
}
