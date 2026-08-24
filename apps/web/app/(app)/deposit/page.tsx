import { createClient } from "@/lib/supabase/server";
import { KycPrompt } from "@/components/KycPrompt";
import { DepositForm } from "./DepositForm";

export default async function DepositPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: config }] = await Promise.all([
    supabase.from("profiles").select("kyc_status").eq("id", user!.id).single(),
    supabase.from("platform_config").select("key, value")
  ]);

  const configMap = Object.fromEntries((config ?? []).map((c) => [c.key, c.value]));

  return (
    <div className="px-4 pt-5 sm:px-6">
      <h1 className="text-xl font-extrabold text-text-primary">Deposit</h1>
      <p className="mt-1 text-xs text-text-secondary">Fund your wallet — then trade it into a plan whenever you're ready.</p>
      <div className="mt-4">
        {profile?.kyc_status === "approved" ? (
          <DepositForm
            depositAddress={configMap.receiving_wallet_address ?? ""}
            minDeposit={parseFloat(configMap.min_deposit_usdt ?? "10")}
            telegramUrl={configMap.telegram_support_url ?? "https://t.me/KRYPTONinv"}
          />
        ) : (
          <KycPrompt status={profile?.kyc_status ?? "unverified"} action="deposit" />
        )}
      </div>
    </div>
  );
}
