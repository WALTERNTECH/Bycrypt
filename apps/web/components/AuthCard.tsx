import Link from "next/link";
import { Logo } from "./Logo";

export function AuthCard({
  title,
  subtitle,
  children,
  footer
}: {
  title: string;
  /** Optional. The signup and login screens carry no explanatory line —
   *  a field labelled Email needs no sentence telling you it is an email. */
  subtitle?: string;
  children: React.ReactNode;
  /** Optional: the reset screens have nowhere sensible to send someone. */
  footer?: React.ReactNode;
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
          {subtitle && <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>}
          <div className={subtitle ? "mt-6" : "mt-5"}>{children}</div>
        </div>
        {footer && <p className="mt-6 text-center text-sm text-text-secondary">{footer}</p>}
      </div>
    </div>
  );
}
