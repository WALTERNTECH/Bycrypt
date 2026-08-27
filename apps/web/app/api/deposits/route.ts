import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidTxHash, normalizeTxHash } from "@/lib/tron-address";
import { runDepositVerification } from "@/lib/depositVerification";
import { verifyTransactionKey } from "@/lib/transactionKey";
import { sendAdminAlert } from "@/lib/adminEmail";

const bodySchema = z.object({
  tx_hash: z.string().min(10),
  transaction_key: z.string().min(1),
  network: z.enum(["TRC20"]).default("TRC20"),
  claimed_amount: z.number().positive().nullable().optional()
});

// Deposits fund the user's wallet balance directly — no tier is chosen
// here. Tiers are chosen later, at "buy" time, from wallet funds
// (see /api/investments/buy).
//
// Verification runs automatically where possible, but Krypton Support
// also reconciles every deposit manually — this route notifies every
// active admin the moment a deposit is submitted, with the user's own
// claimed amount, so it can be matched against a block explorer and
// credited by hand from the admin Deposits queue regardless of whether
// automatic verification succeeds.
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, transaction_key_hash, kyc_status")
    .eq("id", user.id)
    .single();
  if (!verifyTransactionKey(parsed.data.transaction_key, profile?.transaction_key_hash)) {
    return NextResponse.json({ error: "Incorrect transaction key." }, { status: 403 });
  }
  if (profile?.kyc_status !== "approved") {
    return NextResponse.json({ error: "Verify your identity before depositing." }, { status: 403 });
  }

  const txHash = normalizeTxHash(parsed.data.tx_hash);
  if (!isValidTxHash(txHash)) {
    return NextResponse.json({ error: "That doesn't look like a valid transaction hash." }, { status: 400 });
  }

  // Insert as the authenticated user so RLS enforces user_id = auth.uid();
  // the DB's UNIQUE(tx_hash) constraint is the last line of defense
  // against double-crediting the same on-chain transaction.
  const { data: deposit, error: insertError } = await supabase
    .from("deposits")
    .insert({
      user_id: user.id,
      tx_hash: txHash,
      network: parsed.data.network,
      claimed_amount: parsed.data.claimed_amount ?? null
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "This transaction hash has already been submitted." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Could not create the deposit record." }, { status: 500 });
  }

  // Notify admins immediately — this is the reconciliation queue entry,
  // independent of whether automatic verification below succeeds.
  const { data: admins } = await admin.from("admin_users").select("id").eq("is_active", true);
  if (admins && admins.length > 0) {
    const amountText = parsed.data.claimed_amount ? `${parsed.data.claimed_amount} USDT` : "an unspecified amount";
    await admin.from("notifications").insert(
      admins.map((a) => ({
        admin_id: a.id,
        type: "deposit_submitted",
        message: `${profile?.full_name ?? "A user"} submitted a deposit of ${amountText} (tx ${txHash.slice(0, 10)}…) — reconcile in the Deposits queue.`
      }))
    );
  }

  // Email the same alert so support sees it without watching the
  // dashboard. Fire-and-forget: the deposit row already exists and must
  // not depend on mail delivery.
  void sendAdminAlert({
    kind: "deposit",
    userName: profile?.full_name ?? "A user",
    userEmail: user.email,
    amount: parsed.data.claimed_amount ?? null,
    detail: `Tx ${txHash} · ${parsed.data.network}`,
    actionPath: "/dashboard/deposits"
  });

  try {
    const outcome = await runDepositVerification(deposit.id);
    const httpStatus = outcome.status === "rejected" ? 400 : outcome.status === "confirmed" ? 200 : 202;
    return NextResponse.json({ deposit_id: deposit.id, ...outcome }, { status: httpStatus });
  } catch {
    return NextResponse.json(
      {
        deposit_id: deposit.id,
        status: "pending_verification",
        message: "Submitted — our team will confirm it shortly."
      },
      { status: 202 }
    );
  }
}
