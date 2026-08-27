import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/auditLog";

// Two ways to move a wallet, because support thinks in both:
//   amount          — a relative credit/debit ("give them 25 more")
//   target_balance  — an absolute correction ("this should read 500")
// Exactly one must be supplied.
const bodySchema = z
  .object({
    amount: z.number().refine((n) => n !== 0, "Amount can't be zero").optional(),
    target_balance: z.number().min(0).optional(),
    reason: z.string().min(1).max(255)
  })
  .refine((b) => (b.amount == null) !== (b.target_balance == null), {
    message: "Provide either amount or target_balance"
  });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter an amount and a reason." }, { status: 400 });
  }

  const supabaseAdmin = createAdminClient();
  const { data: profileBefore } = await supabaseAdmin
    .from("profiles")
    .select("wallet_balance")
    .eq("id", params.id)
    .maybeSingle();
  if (!profileBefore) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const before = parseFloat(String(profileBefore.wallet_balance));
  let applied: number;
  let newBalance: number;

  if (parsed.data.target_balance != null) {
    // Absolute set — read-modify-write happens inside the function so a
    // concurrent credit can't be clobbered by a stale delta.
    const { data: delta, error } = await supabaseAdmin.rpc("set_wallet_balance", {
      p_user_id: params.id,
      p_target: parsed.data.target_balance
    });
    if (error) return NextResponse.json({ error: "Failed to set balance." }, { status: 500 });
    applied = parseFloat(String(delta ?? 0));
    newBalance = parsed.data.target_balance;
  } else {
    const delta = parsed.data.amount!;
    if (before + delta < 0) {
      return NextResponse.json({ error: "That would take the wallet balance negative." }, { status: 400 });
    }
    const { error } = await supabaseAdmin.rpc("increment_wallet_balance", {
      p_user_id: params.id,
      p_amount: delta
    });
    if (error) return NextResponse.json({ error: "Failed to adjust wallet." }, { status: 500 });
    applied = delta;
    newBalance = before + delta;
  }

  // A zero delta means the balance already matched — nothing moved, so
  // don't tell the user their wallet changed.
  if (applied !== 0) {
    await supabaseAdmin.from("notifications").insert({
      user_id: params.id,
      type: "wallet_adjusted",
      message: `Your Krypton wallet balance was ${applied > 0 ? "credited" : "debited"} by ${Math.abs(
        applied
      ).toFixed(2)} USDT: ${parsed.data.reason}`
    });
  }

  await logAdminAction(admin.id, "adjust_wallet_balance", "profile", params.id, {
    mode: parsed.data.target_balance != null ? "set" : "delta",
    applied,
    before,
    after: newBalance,
    reason: parsed.data.reason
  });

  return NextResponse.json({ ok: true, applied, new_balance: newBalance });
}
