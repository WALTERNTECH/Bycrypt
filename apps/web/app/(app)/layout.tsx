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
      <header className="sticky top-0 z-40 border-b border-border bg-base/95 backdrop-blur">
        <TopBar />
        <TickerStrip rows={symbols ?? []} />
      </header>

      <main className="mx-auto max-w-lg pb-20">
        {children}
        <RiskNotice />
      </main>

      <BottomNav />
    </div>
  );
}
