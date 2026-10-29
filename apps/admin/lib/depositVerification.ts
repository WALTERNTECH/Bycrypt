import { createAdminClient } from "@/lib/supabase/admin";
import { verifyBitcoinDeposit } from "@/lib/bitcoin";

const REASON_MESSAGES: Record<string, string> = {
  transaction_not_found: "Transaction not found on the Bitcoin network.",
  wrong_destination_address: "No output pays the configured receiving address.",
  explorer_unreachable: "Couldn't reach the block explorer — try again shortly.",
  rate_unavailable: "BTC/USD rate unavailable — try again shortly.",
  verification_error: "Verification error — try again shortly.",
  insufficient_confirmations: "Waiting for more confirmations."
};

const RETRYABLE_REASONS = new Set([
  "explorer_unreachable",
  "rate_unavailable",
  "verification_error",
  "insufficient_confirmations"
]);

export interface DepositVerificationOutcome {
  status: "confirmed" | "pending_verification" | "rejected";
  message: string;
}

// Deposits fund the user's wallet_balance directly (credited atomically
// via the credit_wallet_balance() Postgres function) — they're no longer
// tied to a tier. Tiers are chosen later, at "buy" time, from wallet funds.
export async function runDepositVerification(depositId: string): Promise<DepositVerificationOutcome> {
  const admin = createAdminClient();

  const { data: deposit, error: depositError } = await admin
    .from("deposits")
    .select("*")
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

  const result = await verifyBitcoinDeposit(deposit.tx_hash, receivingAddress);

  if (result.ok) {
    // Single atomic call — status flip + wallet credit + referral bonus
    // all happen in one transaction, so a mid-flight failure can never
    // leave a deposit "confirmed" with the wallet never credited.
    // Record what arrived on-chain and the rate it was priced at, so the
    // credited USD figure can always be reconciled back to the block.
    await admin
      .from("deposits")
      .update({ asset_amount: result.btcAmount, rate_usd: result.rateUsd })
      .eq("id", depositId);

    const { error: confirmError } = await admin.rpc("confirm_deposit", {
      p_deposit_id: depositId,
      p_amount: result.usdAmount
    });
    if (confirmError) {
      return { status: "pending_verification", message: "Verified on-chain but couldn't credit the wallet yet — try reverifying." };
    }

    return {
      status: "confirmed",
      message: `Confirmed — ${result.btcAmount} BTC @ $${result.rateUsd} credited as $${result.usdAmount}.`
    };
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
