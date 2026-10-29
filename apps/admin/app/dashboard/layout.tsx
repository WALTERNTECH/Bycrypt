import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";
import { AdminSidebar } from "@/components/AdminSidebar";



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
      {/* Sidebar is a real column on desktop and a drawer on anything
          narrower — never a row of buttons above the content. */}
      <aside className="bg-base lg:w-60 lg:shrink-0 lg:border-r lg:border-border">
        <div className="hidden h-16 items-center px-5 lg:flex">
          <Link href="/dashboard">
            <Logo />
          </Link>
        </div>
        <AdminSidebar unreadCount={unreadCount ?? 0} />
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex h-16 items-center justify-between border-b border-border px-5">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-text-primary">{adminRow.full_name}</p>
            <p className="text-[11px] capitalize text-text-secondary">
              {(adminRow.role ?? "admin").replace("_", " ")}
            </p>
          </div>
          <SignOutButton />
        </header>
        <main className="p-5 sm:p-7">{children}</main>
      </div>
    </div>
  );
}
