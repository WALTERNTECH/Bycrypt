import { createClient } from "@/lib/supabase/server";
import { KycPrompt } from "@/components/KycPrompt";
import { TradeFlow } from "./TradeFlow";

export default async function TradePage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: tiers }, { data: config }] = await Promise.all([
    supabase.from("profiles").select("kyc_status, wallet_balance").eq("id", user!.id).single(),
    supabase.from("investment_tiers").select("*").eq("is_active", true).order("lockup_days"),
    supabase.from("platform_config").select("value").eq("key", "min_deposit_usdt").maybeSingle()
  ]);

  const minAmount = parseFloat(config?.value ?? "10");

  return (
    <div className="px-4 pt-5 sm:px-6">
      <h1 className="text-lg font-bold text-text-primary">Trade</h1>
      <p className="mt-1 text-xs text-text-secondary">
        Allocate your wallet balance into a plan. The bot puts it to work in whatever's moving.
      </p>
      <div className="mt-4">
        {profile?.kyc_status === "approved" ? (
          <TradeFlow
            tiers={tiers ?? []}
            walletBalance={parseFloat(String(profile?.wallet_balance ?? 0))}
            minAmount={minAmount}
          />
        ) : (
          <KycPrompt status={profile?.kyc_status ?? "unverified"} action="trade" />
        )}
      </div>
    </div>
  );
}
