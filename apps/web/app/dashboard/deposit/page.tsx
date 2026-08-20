import { createClient } from "@/lib/supabase/server";
import { DepositForm } from "./DepositForm";

export default async function DepositPage() {
  const supabase = createClient();
  const [{ data: tiers }, { data: config }] = await Promise.all([
    supabase.from("investment_tiers").select("*").eq("is_active", true).order("lockup_days"),
    supabase.from("platform_config").select("key, value")
  ]);

  const configMap = Object.fromEntries((config ?? []).map((c) => [c.key, c.value]));

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-text-primary">Deposit</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Choose a lockup tier, send USDT (TRC20) to Krypton's address, then submit your
        transaction hash for verification.
      </p>
      <div className="mt-6">
        <DepositForm
          tiers={tiers ?? []}
          depositAddress={configMap.receiving_wallet_address ?? ""}
          minDeposit={parseFloat(configMap.min_deposit_usdt ?? "10")}
        />
      </div>
    </div>
  );
}
