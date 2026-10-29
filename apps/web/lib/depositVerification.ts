import { createAdminClient } from "@/lib/supabase/admin";
import { findPaymentToAddress, verifyBitcoinDeposit } from "@/lib/bitcoin";

const REASON_MESSAGES: Record<string, string> = {
  payment_not_found:
    "We haven't seen that payment on the Bitcoin network yet. If you've just sent it, give it a few minutes and tap Verify again.",
  transaction_not_found:
    "We couldn't find that transaction on the Bitcoin network yet. Wait a moment and try again.",
  wrong_destination_address: "That transaction doesn't pay Krypton's deposit address.",
  explorer_unreachable: "We couldn't reach the Bitcoin network right now. We'll keep trying — check back shortly.",
  rate_unavailable: "We couldn't price your BTC just now. We'll keep trying — check back shortly.",
  verification_error: "Something went wrong verifying this deposit. We'll keep trying — check back shortly.",
  insufficient_confirmations: "Your payment has arrived and is waiting for network confirmations.",
  amount_not_set: "This deposit has no expected amount recorded. Start a new one.",
  invalid_address:
    "The receiving address on file is not a valid Bitcoin address. An operator needs to correct it before deposits can be verified.",
  already_claimed: "That payment has already been credited to a deposit. Start a new one if you sent again.",
  address_not_configured:
    "The platform's receiving wallet isn't configured yet. This deposit can't be verified until it is."
};

// Nothing in the scanning path is the depositor's fault, so nothing in it
// rejects a deposit. "Not found yet" means wait, not wrong — the only
// non-retryable outcomes are on the legacy txid path, where a user-typed
// value really can be wrong.
const RETRYABLE_REASONS = new Set([
  "payment_not_found",
  "explorer_unreachable",
  "rate_unavailable",
  "verification_error",
  "insufficient_confirmations",
  "amount_not_set",
  "already_claimed",
  "address_not_configured",
  "invalid_address"
]);

export interface DepositVerificationOutcome {
  status: "confirmed" | "pending_verification" | "rejected";
  message: string;
  btc_amount?: number;
  usd_amount?: number;
  confirmations?: number;
}

/**
 * Runs (or re-runs) on-chain verification for a single deposit and, on
 * success, credits the verified amount straight to the user's wallet —
 * automatically, no admin step required.
 *
 * Two paths. A deposit created with an expected amount is verified by
 * scanning the receiving address for a payment of exactly that amount
 * (see findPaymentToAddress). A deposit that already carries a tx_hash —
 * either a legacy row or one credited by an operator — is verified by
 * that hash directly.
 *
 * Safe to call repeatedly: confirmed and rejected deposits are returned
 * as-is without re-verifying or double-crediting.
 */
export async function runDepositVerification(depositId: string): Promise<DepositVerificationOutcome> {
  const admin = createAdminClient();

  const { data: deposit, error: depositError } = await admin
    .from("deposits")
    .select("*")
    .eq("id", depositId)
    .single();

  if (depositError || !deposit) throw new Error("Deposit not found");

  if (deposit.status === "confirmed") {
    return { status: "confirmed", message: "This deposit is confirmed and the funds are in your wallet." };
  }
  if (deposit.status === "rejected") {
    return {
      status: "rejected",
      message: deposit.rejection_reason
        ? (REASON_MESSAGES[deposit.rejection_reason] ?? deposit.rejection_reason)
        : "This deposit could not be verified."
    };
  }

  const { data: configRow } = await admin
    .from("platform_config")
    .select("value")
    .eq("key", "receiving_wallet_address")
    .single();

  const receivingAddress = configRow?.value;
  if (!receivingAddress || receivingAddress.startsWith("REPLACE_WITH_")) {
    return { status: "pending_verification", message: REASON_MESSAGES.address_not_configured };
  }

  const expectedBtc =
    deposit.expected_btc === null || deposit.expected_btc === undefined
      ? null
      : parseFloat(String(deposit.expected_btc));

  let result:
    | { ok: boolean; reason?: string; txid?: string; btcAmount?: number; usdAmount?: number; rateUsd?: number; confirmations?: number }
    | null = null;

  if (deposit.tx_hash) {
    const byHash = await verifyBitcoinDeposit(deposit.tx_hash, receivingAddress);
    result = { ...byHash, txid: deposit.tx_hash };
  } else if (expectedBtc && expectedBtc > 0) {
    // Every hash already on a deposit row is off the table — that is what
    // stops one on-chain payment being credited twice.
    const { data: claimed } = await admin.from("deposits").select("tx_hash").not("tx_hash", "is", null);
    result = await findPaymentToAddress(
      receivingAddress,
      expectedBtc,
      (claimed ?? []).map((d: any) => String(d.tx_hash))
    );
  } else {
    return { status: "pending_verification", message: REASON_MESSAGES.amount_not_set };
  }

  if (result.ok && result.txid) {
    // Claim the transaction before crediting anything. UNIQUE(tx_hash) is
    // the lock: if a concurrent verification got there first this update
    // fails, and no money moves.
    const { error: claimError } = await admin
      .from("deposits")
      .update({ tx_hash: result.txid, asset_amount: result.btcAmount, rate_usd: result.rateUsd })
      .eq("id", depositId);

    if (claimError) {
      return { status: "pending_verification", message: REASON_MESSAGES.already_claimed };
    }

    // Single atomic call — status flip + wallet credit + referral bonus
    // all happen in one transaction, so a mid-flight failure can never
    // leave a deposit confirmed with the wallet never actually credited.
    const { error: confirmError } = await admin.rpc("confirm_deposit", {
      p_deposit_id: depositId,
      p_amount: result.usdAmount
    });
    if (confirmError) {
      return {
        status: "pending_verification",
        message: "Verified on-chain — crediting your wallet now, check back shortly."
      };
    }

    return {
      status: "confirmed",
      message: `${result.btcAmount} BTC confirmed — $${result.usdAmount} added to your wallet.`,
      btc_amount: result.btcAmount,
      usd_amount: result.usdAmount,
      confirmations: result.confirmations
    };
  }

  const reason = result.reason ?? "verification_error";
  if (RETRYABLE_REASONS.has(reason)) {
    return {
      status: "pending_verification",
      message: REASON_MESSAGES[reason] ?? "Still verifying — check back shortly.",
      btc_amount: result.btcAmount,
      confirmations: result.confirmations
    };
  }

  await admin.from("deposits").update({ status: "rejected", rejection_reason: reason }).eq("id", depositId);

  await admin.from("notifications").insert({
    user_id: deposit.user_id,
    type: "deposit_rejected",
    message: `Your deposit could not be verified: ${REASON_MESSAGES[reason] ?? reason}`
  });

  return { status: "rejected", message: REASON_MESSAGES[reason] ?? "This deposit could not be verified." };
}
