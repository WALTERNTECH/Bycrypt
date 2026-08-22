import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/notifications", label: "Notifications" },
  { href: "/dashboard/users", label: "Users" },
  { href: "/dashboard/kyc", label: "KYC" },
  { href: "/dashboard/deposits", label: "Deposits" },
  { href: "/dashboard/investments", label: "Investments" },
  { href: "/dashboard/withdrawals", label: "Withdrawals" },
  { href: "/dashboard/bot-performance", label: "Bot Performance" },
  { href: "/dashboard/audit-logs", label: "Audit Logs" },
  { href: "/dashboard/config", label: "Config" }
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!adminRow) redirect("/login");

  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("admin_id", user.id)
    .eq("is_read", false);

  return (
    <div className="min-h-screen bg-base lg:flex">
      <aside className="border-b border-border/60 bg-panel lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center px-5">
          <Link href="/dashboard">
            <Logo />
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:pb-5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-panel-2 hover:text-text-primary"
            >
              {item.label}
              {item.href === "/dashboard/notifications" && !!unreadCount && (
                <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-base">
                  {unreadCount}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex-1">
        <header className="flex h-16 items-center justify-between border-b border-border/60 px-5">
          <div>
            <p className="text-sm font-semibold text-text-primary">{adminRow.full_name}</p>
            <p className="text-xs capitalize text-text-secondary">{adminRow.role.replace("_", " ")}</p>
          </div>
          <SignOutButton />
        </header>
        <main className="p-5 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
