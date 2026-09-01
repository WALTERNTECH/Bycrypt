import { createClient } from "@/lib/supabase/server";
import { TradeMarketList } from "./TradeMarketList";

export default async function TradePage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: symbols }] = await Promise.all([
    supabase.from("profiles").select("wallet_balance").eq("id", user!.id).single(),
    supabase.from("market_symbols").select("symbol, display_name").eq("is_active", true).order("sort_order")
  ]);

  return (
    <div className="px-4 pt-5 sm:px-6">
      <h1 className="text-xl font-extrabold text-text-primary">Trade</h1>
      <p className="mt-1 text-xs text-text-secondary">Pick a market to view its chart and place an order.</p>
      <div className="mt-4">
        <TradeMarketList rows={symbols ?? []} walletBalance={parseFloat(String(profile?.wallet_balance ?? 0))} />
      </div>
    </div>
  );
}
