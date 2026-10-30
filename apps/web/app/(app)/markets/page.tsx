import { createClient } from "@/lib/supabase/server";
import { MarketTable } from "@/components/MarketTable";
import { PageTail } from "@/components/PageTail";

export const revalidate = 30;

export default async function MarketsPage({
  searchParams
}: {
  searchParams: { q?: string };
}) {
  const supabase = createClient();
  const { data: symbols } = await supabase
    .from("market_symbols")
    .select("symbol, display_name")
    .eq("is_active", true)
    .order("sort_order");

  return (
    <div className="px-4 pt-5 sm:px-6">
      <h1 className="text-xl font-extrabold text-text-primary">Markets</h1>
      <p className="mt-1 text-xs text-text-secondary">Tap any asset for a full chart.</p>
      <div className="mt-4">
        {/* The header search pushes ?q= here — this page used to ignore it,
            which made the search bar look broken. */}
        <MarketTable rows={symbols ?? []} query={searchParams.q ?? ""} />
      </div>

      <PageTail variant="markets" />
    </div>
  );
}
