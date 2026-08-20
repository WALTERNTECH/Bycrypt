import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MarketTable } from "@/components/MarketTable";

export const revalidate = 30;

export default async function MarketsPage() {
  const supabase = createClient();
  const { data: symbols } = await supabase
    .from("market_symbols")
    .select("symbol, display_name")
    .eq("is_active", true)
    .order("sort_order");

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-text-primary">Markets</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Live crypto prices, streamed directly from Binance. Tap any asset for a full chart.
        </p>
        <div className="mt-6">
          <MarketTable rows={symbols ?? []} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
