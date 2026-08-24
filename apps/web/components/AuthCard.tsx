import Link from "next/link";
import { Logo } from "./Logo";

export function AuthCard({
  title,
  subtitle,
  children,
  footer
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-base px-4 py-12">
      {/* soft brand glow behind the card */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-brand/10 blur-[100px]" />

      <div className="relative w-full max-w-md">
        <div className="mb-7 flex justify-center">
          <Link href="/">
            <Logo />
          </Link>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-7 shadow-lift sm:p-8">
          <h1 className="text-xl font-extrabold text-text-primary">{title}</h1>
          <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-6 text-center text-sm text-text-secondary">{footer}</p>
      </div>
    </div>
  );
}
