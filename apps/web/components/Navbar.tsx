import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "./Logo";
import { SignOutButton } from "./SignOutButton";
import { TelegramButton } from "./TelegramButton";

const navLinks = [
  { href: "/markets", label: "Markets" },
  { href: "/#tiers", label: "Tiers" },
  { href: "/#how-it-works", label: "How it works" }
];

export async function Navbar() {
  const supabase = createClient();
  const [
    {
      data: { user }
    },
    { data: config }
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("platform_config").select("value").eq("key", "telegram_support_url").maybeSingle()
  ]);
  const telegramUrl = config?.value ?? "https://t.me/KRYPTONinv";

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-base/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <TelegramButton url={telegramUrl} />
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-panel"
              >
                Dashboard
              </Link>
              <SignOutButton className="hidden sm:inline-block text-sm text-text-secondary hover:text-negative transition-colors" />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-panel"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-base transition-colors hover:bg-brand-hover"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
