import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { TickerStrip } from "@/components/TickerStrip";
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
      <header className="sticky top-0 z-40 bg-header pt-[env(safe-area-inset-top)] shadow-[0_1px_0_rgba(0,0,0,0.06),0_4px_16px_-8px_rgba(0,0,0,0.15)]">
        <TopBar />
        <TickerStrip rows={symbols ?? []} />
      </header>

      <main className="mx-auto max-w-lg pb-24">
        {children}
        <RiskNotice />
      </main>

      <BottomNav />
    </div>
  );
}
