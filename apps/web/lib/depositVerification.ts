import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTrc20Deposit, USDT_TRC20_CONTRACT_MAINNET } from "@/lib/trongrid";

const REASON_MESSAGES: Record<string, string> = {
  transaction_not_found: "We couldn't find that transaction on the TRON network yet. Double-check the hash, or wait a moment and try again.",
  transaction_failed: "That transaction failed on-chain, so it can't be credited.",
  no_matching_transfer_event: "That transaction doesn't contain a USDT (TRC20) transfer.",
  wrong_destination_address: "That transaction wasn't sent to Krypton's deposit address.",
  trongrid_unreachable: "We couldn't reach the TRON network right now. We'll keep trying — check back shortly.",
  verification_error: "Something went wrong verifying this deposit. We'll keep trying — check back shortly.",
  insufficient_confirmations: "Your transaction was found and is waiting for more network confirmations."
};

const RETRYABLE_REASONS = new Set(["trongrid_unreachable", "verification_error", "insufficient_confirmations"]);

export interface DepositVerificationOutcome {
  status: "confirmed" | "pending_verification" | "rejected";
  message: string;
}

/**
 * Runs (or re-runs) on-chain verification for a single deposit and, on
 * success, credits the verified amount straight to the user's wallet
 * balance — automatically, no admin step required. Safe to call
 * repeatedly — confirmed/rejected deposits are returned as-is without
 * re-verifying or double-crediting.
 */
export async function runDepositVerification(depositId: string): Promise<DepositVerificationOutcome> {
  const admin = createAdminClient();

  const { data: deposit, error: depositError } = await admin
    .from("deposits")
    .select("*")
    .eq("id", depositId)
    .single();

  if (depositError || !deposit) {
    throw new Error("Deposit not found");
  }

  if (deposit.status === "confirmed") {
    return { status: "confirmed", message: "This deposit is confirmed and the funds are in your wallet." };
  }
  if (deposit.status === "rejected") {
    return {
      status: "rejected",
      message: deposit.rejection_reason ?? "This deposit could not be verified."
    };
  }

  const { data: configRow } = await admin
    .from("platform_config")
    .select("value")
    .eq("key", "receiving_wallet_address")
    .single();

  const receivingAddress = configRow?.value;
  if (!receivingAddress || receivingAddress.startsWith("REPLACE_WITH_")) {
    return {
      status: "pending_verification",
      message: "The platform's receiving wallet isn't configured yet. This deposit can't be verified until it is."
    };
  }

  const result = await verifyTrc20Deposit(deposit.tx_hash, receivingAddress, USDT_TRC20_CONTRACT_MAINNET);

  if (result.ok) {
    await admin
      .from("deposits")
      .update({ status: "confirmed", amount: result.amount, confirmed_at: new Date().toISOString() })
      .eq("id", depositId);

    // Atomic increment — safe even if this runs concurrently with a
    // manual admin reverify.
    await admin.rpc("credit_wallet_balance", { p_user_id: deposit.user_id, p_amount: result.amount });

    await admin.from("notifications").insert({
      user_id: deposit.user_id,
      type: "deposit_confirmed",
      message: `Your deposit of ${result.amount} USDT was confirmed and added to your wallet balance.`
    });

    return { status: "confirmed", message: `Deposit of ${result.amount} USDT confirmed and added to your wallet.` };
  }

  const reason = result.reason ?? "verification_error";
  if (RETRYABLE_REASONS.has(reason)) {
    return { status: "pending_verification", message: REASON_MESSAGES[reason] ?? "Still verifying — check back shortly." };
  }

  await admin
    .from("deposits")
    .update({ status: "rejected", rejection_reason: reason })
    .eq("id", depositId);

  await admin.from("notifications").insert({
    user_id: deposit.user_id,
    type: "deposit_rejected",
    message: `Your deposit could not be verified: ${REASON_MESSAGES[reason] ?? reason}`
  });

  return { status: "rejected", message: REASON_MESSAGES[reason] ?? "This deposit could not be verified." };
}
