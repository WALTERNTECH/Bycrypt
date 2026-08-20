import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTrc20Deposit, USDT_TRC20_CONTRACT_MAINNET } from "@/lib/trongrid";

const REASON_MESSAGES: Record<string, string> = {
  transaction_not_found: "Transaction not found on-chain yet.",
  transaction_failed: "Transaction failed on-chain.",
  no_matching_transfer_event: "No matching USDT (TRC20) transfer event.",
  wrong_destination_address: "Sent to the wrong address.",
  trongrid_unreachable: "Couldn't reach TronGrid — try again shortly.",
  verification_error: "Verification error — try again shortly.",
  insufficient_confirmations: "Found on-chain, awaiting more confirmations."
};

const RETRYABLE_REASONS = new Set(["trongrid_unreachable", "verification_error", "insufficient_confirmations"]);

export interface DepositVerificationOutcome {
  status: "confirmed" | "pending_verification" | "rejected";
  message: string;
}

export async function runDepositVerification(depositId: string): Promise<DepositVerificationOutcome> {
  const admin = createAdminClient();

  const { data: deposit, error: depositError } = await admin
    .from("deposits")
    .select("*, investment_tiers(id, lockup_days, max_return_pct)")
    .eq("id", depositId)
    .single();

  if (depositError || !deposit) throw new Error("Deposit not found");

  if (deposit.status === "confirmed") {
    return { status: "confirmed", message: "Already confirmed." };
  }
  if (deposit.status === "rejected") {
    return { status: "rejected", message: deposit.rejection_reason ?? "Previously rejected." };
  }

  const { data: configRow } = await admin
    .from("platform_config")
    .select("value")
    .eq("key", "receiving_wallet_address")
    .single();

  const receivingAddress = configRow?.value;
  if (!receivingAddress || receivingAddress.startsWith("REPLACE_WITH_")) {
    return { status: "pending_verification", message: "Receiving wallet address isn't configured yet." };
  }

  const result = await verifyTrc20Deposit(deposit.tx_hash, receivingAddress, USDT_TRC20_CONTRACT_MAINNET);

  if (result.ok) {
    const tier = deposit.investment_tiers as any;
    const maturityDate = new Date(Date.now() + tier.lockup_days * 24 * 60 * 60 * 1000).toISOString();

    await admin
      .from("deposits")
      .update({ status: "confirmed", amount: result.amount, confirmed_at: new Date().toISOString() })
      .eq("id", depositId);

    await admin.from("investments").insert({
      user_id: deposit.user_id,
      deposit_id: deposit.id,
      tier_id: tier.id,
      amount: result.amount,
      max_return_pct: tier.max_return_pct,
      maturity_date: maturityDate
    });

    await admin.from("notifications").insert({
      user_id: deposit.user_id,
      type: "deposit_confirmed",
      message: `Your deposit of ${result.amount} USDT was confirmed and your ${tier.lockup_days}-day investment is now active.`
    });

    return { status: "confirmed", message: `Confirmed — ${result.amount} USDT, investment created.` };
  }

  const reason = result.reason ?? "verification_error";
  if (RETRYABLE_REASONS.has(reason)) {
    return { status: "pending_verification", message: REASON_MESSAGES[reason] ?? "Still pending." };
  }

  await admin.from("deposits").update({ status: "rejected", rejection_reason: reason }).eq("id", depositId);

  await admin.from("notifications").insert({
    user_id: deposit.user_id,
    type: "deposit_rejected",
    message: `Your deposit could not be verified: ${REASON_MESSAGES[reason] ?? reason}`
  });

  return { status: "rejected", message: REASON_MESSAGES[reason] ?? "Rejected." };
}
