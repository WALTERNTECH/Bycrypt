import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/auditLog";

const bodySchema = z.object({ reason: z.string().min(1).max(255) });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "A reason is required." }, { status: 400 });

  const supabaseAdmin = createAdminClient();
  const { data: withdrawal } = await supabaseAdmin
    .from("withdrawals")
    .select("id, status, user_id, amount")
    .eq("id", params.id)
    .maybeSingle();
  if (!withdrawal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (withdrawal.status !== "pending") {
    return NextResponse.json({ error: "Only pending requests can be rejected." }, { status: 400 });
  }

  await supabaseAdmin
    .from("withdrawals")
    .update({ status: "rejected", admin_id: admin.id, rejection_reason: parsed.data.reason })
    .eq("id", params.id);

  // The requested amount was reserved out of wallet_balance the moment
  // the user submitted the request (see request_withdrawal()) — refund
  // it now that the request is being rejected. Plain increment, no
  // referral side effects (this isn't new money, it's a reversal).
  await supabaseAdmin.rpc("increment_wallet_balance", { p_user_id: withdrawal.user_id, p_amount: withdrawal.amount });

  await supabaseAdmin.from("notifications").insert({
    user_id: withdrawal.user_id,
    type: "withdrawal_rejected",
    message: `Your withdrawal request for ${withdrawal.amount} USDT was rejected and refunded to your wallet: ${parsed.data.reason}`
  });

  await logAdminAction(admin.id, "reject_withdrawal", "withdrawal", params.id, { reason: parsed.data.reason });

  return NextResponse.json({ ok: true });
}
