import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TradeChartClient } from "./TradeChartClient";

export default async function TradeSymbolPage({ params }: { params: { symbol: string } }) {
  const supabase = createClient();
  const symbol = params.symbol.toUpperCase();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const [{ data: row }, { data: profile }, { data: tier }, { data: openPosition }, { data: config }] = await Promise.all([
    supabase.from("market_symbols").select("symbol, display_name").eq("symbol", symbol).eq("is_active", true).maybeSingle(),
    supabase.from("profiles").select("wallet_balance").eq("id", user!.id).single(),
    supabase.from("investment_tiers").select("id, lockup_days, min_return_pct, max_return_pct").eq("is_active", true).limit(1).maybeSingle(),
    // The user's single open position, on ANY coin — one runs at a time,
    // so this lets the chart offer to close whatever is open regardless
    // of which market is being viewed.
    supabase
      .from("investments")
      .select("id, amount, accrued_return, traded_symbol")
      .eq("user_id", user!.id)
      .in("status", ["active", "matured"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("platform_config").select("value").eq("key", "min_deposit_usdt").maybeSingle()
  ]);

  if (!row) notFound();

  return (
    <div className="px-4 pt-5 sm:px-6">
      <TradeChartClient
        symbol={row.symbol}
        displayName={row.display_name}
        walletBalance={parseFloat(String(profile?.wallet_balance ?? 0))}
        tierId={tier?.id ?? null}
        lockupDays={tier?.lockup_days ?? 7}
        minAmount={parseFloat(config?.value ?? "10")}
        openPosition={
          openPosition
            ? {
                id: openPosition.id,
                amount: parseFloat(String(openPosition.amount)),
                accrued: parseFloat(String(openPosition.accrued_return)),
                symbol: openPosition.traded_symbol
              }
            : null
        }
      />
    </div>
  );
}
