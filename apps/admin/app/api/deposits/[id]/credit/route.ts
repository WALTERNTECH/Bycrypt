import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/auditLog";

const bodySchema = z.object({ amount: z.number().positive() });

// Manual deposit reconciliation: an admin has checked the transaction
// against a block explorer themselves and confirms the amount by hand.
// This is deliberately the primary path, not a fallback — automatic
// on-chain verification runs too, but isn't relied on alone. Works
// regardless of the deposit's current status EXCEPT 'confirmed', to
// guarantee a deposit is never credited twice.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid amount." }, { status: 400 });

  const supabaseAdmin = createAdminClient();
  const { data: deposit } = await supabaseAdmin
    .from("deposits")
    .select("id, user_id, status")
    .eq("id", params.id)
    .maybeSingle();
  if (!deposit) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (deposit.status === "confirmed") {
    return NextResponse.json({ error: "This deposit is already confirmed." }, { status: 400 });
  }

  await supabaseAdmin
    .from("deposits")
    .update({ status: "confirmed", amount: parsed.data.amount, confirmed_at: new Date().toISOString() })
    .eq("id", params.id);

  // credit_wallet_balance() also pays out the referrer's 10% bonus, if any.
  const { error: creditError } = await supabaseAdmin.rpc("credit_wallet_balance", {
    p_user_id: deposit.user_id,
    p_amount: parsed.data.amount
  });
  if (creditError) {
    return NextResponse.json({ error: "Failed to credit wallet." }, { status: 500 });
  }

  await supabaseAdmin.from("notifications").insert({
    user_id: deposit.user_id,
    type: "deposit_confirmed",
    message: `Your deposit of ${parsed.data.amount} USDT was confirmed by our team and added to your wallet balance.`
  });

  await logAdminAction(admin.id, "manually_credit_deposit", "deposit", params.id, { amount: parsed.data.amount });

  return NextResponse.json({ ok: true });
}
