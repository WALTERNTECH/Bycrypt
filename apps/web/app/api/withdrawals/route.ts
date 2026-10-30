import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidBitcoinAddress } from "@/lib/btc-address";
import { sendAdminAlert } from "@/lib/adminEmail";

const bodySchema = z.object({
  amount: z.number().positive(),
  destination_address: z.string().min(10)
});

const REASON_MESSAGES: Record<string, string> = {
  not_authenticated: "Please log in again.",
  invalid_amount: "Enter a valid amount.",
  insufficient_balance: "That's more than your available wallet balance.",
  // Refused in request_withdrawal() rather than here, so it holds however
  // the request arrives.
  simulated_account:
    "This is a test account with simulated figures, so it cannot withdraw. The balance on it is not real money."
};

// Note: this only records a withdrawal request for admin review — the
// requested amount is reserved out of wallet_balance immediately
// (request_withdrawal() is atomic) so it can't be double-spent. Krypton
// never holds or moves crypto funds itself — Support sends the payout
// manually from the platform's own wallet and records the tx_hash once
// approved (see admin app). A rejected request refunds the reservation.
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  if (!isValidBitcoinAddress(parsed.data.destination_address)) {
    return NextResponse.json({ error: "Enter a valid Bitcoin address (1…, 3… or bc1…)." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: withdrawalId, error } = await supabase.rpc("request_withdrawal", {
    p_amount: parsed.data.amount,
    p_destination_address: parsed.data.destination_address
  });

  if (error) {
    const reason = Object.keys(REASON_MESSAGES).find((k) => error.message.includes(k));
    return NextResponse.json({ error: reason ? REASON_MESSAGES[reason] : "Could not submit that request." }, { status: 400 });
  }

  // Notify admins (service role — no admin-scoped RLS insert policy exists).
  const { data: admins } = await admin.from("admin_users").select("id").eq("is_active", true);
  if (admins && admins.length > 0) {
    await admin.from("notifications").insert(
      admins.map((a) => ({
        admin_id: a.id,
        type: "withdrawal_requested",
        message: `New withdrawal request for ${parsed.data.amount.toFixed(2)} USDT is awaiting review.`
      }))
    );
  }

  // Email the payout queue alert. Fire-and-forget — the request is
  // already recorded and must not hinge on mail delivery.
  const { data: requester } = await admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  void sendAdminAlert({
    kind: "withdrawal",
    userName: requester?.full_name ?? "A user",
    userEmail: user.email,
    amount: parsed.data.amount,
    detail: `To ${parsed.data.destination_address}`,
    actionPath: "/dashboard/withdrawals"
  });

  return NextResponse.json({ withdrawal_id: withdrawalId, status: "pending" }, { status: 201 });
}
