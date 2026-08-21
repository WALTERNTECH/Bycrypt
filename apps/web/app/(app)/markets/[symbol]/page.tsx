import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ChevronLeftIcon } from "@/components/icons";
import { MarketDetailClient } from "./MarketDetailClient";

export default async function MarketDetailPage({ params }: { params: { symbol: string } }) {
  const supabase = createClient();
  const symbol = params.symbol.toUpperCase();
  const { data: row } = await supabase
    .from("market_symbols")
    .select("symbol, display_name")
    .eq("symbol", symbol)
    .eq("is_active", true)
    .maybeSingle();

  if (!row) notFound();

  return (
    <div className="px-4 pt-5 sm:px-6">
      <Link href="/markets" className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-text-primary">
        <ChevronLeftIcon className="h-3.5 w-3.5" />
        Markets
      </Link>
      <MarketDetailClient symbol={row.symbol} displayName={row.display_name} />
    </div>
  );
}
