import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";
import { TelegramButton } from "@/components/TelegramButton";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/deposit", label: "Deposit" },
  { href: "/dashboard/investments", label: "Investments" },
  { href: "/dashboard/withdraw", label: "Withdraw" }
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
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

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-base">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-base/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/markets" className="text-sm text-text-secondary hover:text-text-primary">
              Markets
            </Link>
            <TelegramButton url={telegramUrl} />
            <SignOutButton />
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2 sm:px-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-panel hover:text-text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
