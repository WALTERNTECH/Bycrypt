import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { RiskNotice } from "@/components/RiskNotice";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const [
    {
      data: { user }
    },
    { data: symbols }
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("market_symbols").select("symbol, display_name").eq("is_active", true).order("sort_order")
  ]);

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-base">
      {/* App chrome is a white bar; the trading body below stays dark.
          pt-[env(safe-area-inset-top)] keeps it clear of the notch when
          launched from the home screen. */}
      {/* The ticker used to live here, pinned under the header, where a
          constantly sliding strip sat above everything the user was
          actually trying to read. It now sits further down the page, in
          the flow, as a market section rather than as chrome. */}
      <header className="sticky top-0 z-40 border-b border-border bg-header pt-[env(safe-area-inset-top)]">
        <TopBar />
      </header>

      <main className="mx-auto max-w-lg pb-24">
        {children}
        <RiskNotice />
      </main>

      <BottomNav />
    </div>
  );
}
