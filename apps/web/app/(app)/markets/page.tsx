import { createClient } from "@/lib/supabase/server";
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
    <div className="px-4 pt-5 sm:px-6">
      <h1 className="text-lg font-bold text-text-primary">Markets</h1>
      <p className="mt-1 text-xs text-text-secondary">Tap any asset for a full chart.</p>
      <div className="mt-4">
        <MarketTable rows={symbols ?? []} />
      </div>
    </div>
  );
}
