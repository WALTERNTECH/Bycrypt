import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/auditLog";

const bodySchema = z.object({
  amount: z.number().refine((n) => n !== 0, "Amount can't be zero"),
  reason: z.string().min(1).max(255)
});

// General-purpose manual reconciliation tool: credit or debit a
// specific user's Krypton wallet balance directly, independent of any
// particular deposit row (corrections, goodwill adjustments, etc.).
// Reuses increment_wallet_balance() — a plain balance move, no referral
// side effects, since this isn't a fresh deposit.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Enter an amount and a reason." }, { status: 400 });

  const supabaseAdmin = createAdminClient();
  const { data: profileBefore } = await supabaseAdmin
    .from("profiles")
    .select("wallet_balance")
    .eq("id", params.id)
    .maybeSingle();
  if (!profileBefore) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const newBalance = parseFloat(String(profileBefore.wallet_balance)) + parsed.data.amount;
  if (newBalance < 0) {
    return NextResponse.json({ error: "That would take the wallet balance negative." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.rpc("increment_wallet_balance", {
    p_user_id: params.id,
    p_amount: parsed.data.amount
  });
  if (error) return NextResponse.json({ error: "Failed to adjust wallet." }, { status: 500 });

  await supabaseAdmin.from("notifications").insert({
    user_id: params.id,
    type: "wallet_adjusted",
    message: `Your Krypton wallet balance was ${parsed.data.amount > 0 ? "credited" : "debited"} by ${Math.abs(
      parsed.data.amount
    )} USDT: ${parsed.data.reason}`
  });

  await logAdminAction(admin.id, "adjust_wallet_balance", "profile", params.id, {
    amount: parsed.data.amount,
    reason: parsed.data.reason
  });

  return NextResponse.json({ ok: true, new_balance: newBalance });
}
