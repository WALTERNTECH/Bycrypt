import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { KycPrompt } from "@/components/KycPrompt";
import { TradeChartClient } from "./TradeChartClient";

export default async function TradeSymbolPage({ params }: { params: { symbol: string } }) {
  const supabase = createClient();
  const symbol = params.symbol.toUpperCase();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const [{ data: row }, { data: profile }, { data: tier }, { data: openPosition }, { data: config }] = await Promise.all([
    supabase.from("market_symbols").select("symbol, display_name").eq("symbol", symbol).eq("is_active", true).maybeSingle(),
    supabase.from("profiles").select("kyc_status, wallet_balance").eq("id", user!.id).single(),
    supabase.from("investment_tiers").select("id, lockup_days, min_return_pct, max_return_pct").eq("is_active", true).limit(1).maybeSingle(),
    supabase
      .from("investments")
      .select("id, amount, accrued_return")
      .eq("user_id", user!.id)
      .eq("traded_symbol", symbol)
      .in("status", ["active", "matured"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("platform_config").select("value").eq("key", "min_deposit_usdt").maybeSingle()
  ]);

  if (!row) notFound();

  return (
    <div className="px-4 pt-5 sm:px-6">
      {profile?.kyc_status === "approved" ? (
        <TradeChartClient
          symbol={row.symbol}
          displayName={row.display_name}
          walletBalance={parseFloat(String(profile?.wallet_balance ?? 0))}
          tierId={tier?.id ?? null}
          lockupDays={tier?.lockup_days ?? 7}
          minAmount={parseFloat(config?.value ?? "10")}
          openPosition={
            openPosition
              ? { id: openPosition.id, amount: parseFloat(String(openPosition.amount)), accrued: parseFloat(String(openPosition.accrued_return)) }
              : null
          }
        />
      ) : (
        <KycPrompt status={profile?.kyc_status ?? "unverified"} action="trade" />
      )}
    </div>
  );
}
