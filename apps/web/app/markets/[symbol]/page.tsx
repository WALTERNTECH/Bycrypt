import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
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
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <MarketDetailClient symbol={row.symbol} displayName={row.display_name} />
      </main>
      <Footer />
    </div>
  );
}
