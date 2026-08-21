import { createClient } from "@/lib/supabase/server";
import { DepositForm } from "./DepositForm";

export default async function DepositPage({ searchParams }: { searchParams: { tier?: string } }) {
  const supabase = createClient();
  const [{ data: tiers }, { data: config }] = await Promise.all([
    supabase.from("investment_tiers").select("*").eq("is_active", true).order("lockup_days"),
    supabase.from("platform_config").select("key, value")
  ]);

  const configMap = Object.fromEntries((config ?? []).map((c) => [c.key, c.value]));
  const preselectedTier = searchParams.tier ? parseInt(searchParams.tier, 10) : null;

  return (
    <div className="px-4 pt-5 sm:px-6">
      <h1 className="text-lg font-bold text-text-primary">Deposit</h1>
      <p className="mt-1 text-xs text-text-secondary">
        Send USDT (TRC20) to Krypton's address, then submit your transaction hash for
        verification.
      </p>
      <div className="mt-4">
        <DepositForm
          tiers={tiers ?? []}
          depositAddress={configMap.receiving_wallet_address ?? ""}
          minDeposit={parseFloat(configMap.min_deposit_usdt ?? "10")}
          telegramUrl={configMap.telegram_support_url ?? "https://t.me/KRYPTONinv"}
          preselectedTier={preselectedTier}
        />
      </div>
    </div>
  );
}
