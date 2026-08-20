import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/auditLog";

const bodySchema = z.object({ tx_hash: z.string().min(10).max(80) });

// Records that an already-approved withdrawal was paid out. Bycrypt never
// broadcasts the payout itself (PRD 10 — the platform does not custody
// funds long-term) — the admin sends it manually from the platform wallet
// and records the resulting tx_hash here for the audit trail.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "A payout transaction hash is required." }, { status: 400 });

  const supabaseAdmin = createAdminClient();
  const { data: withdrawal } = await supabaseAdmin
    .from("withdrawals")
    .select("id, status, investment_id, user_id, amount")
    .eq("id", params.id)
    .maybeSingle();
  if (!withdrawal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (withdrawal.status !== "approved") {
    return NextResponse.json({ error: "Only approved requests can be marked paid." }, { status: 400 });
  }

  await supabaseAdmin
    .from("withdrawals")
    .update({ status: "processed", tx_hash: parsed.data.tx_hash, processed_at: new Date().toISOString() })
    .eq("id", params.id);

  await supabaseAdmin.from("investments").update({ status: "withdrawn" }).eq("id", withdrawal.investment_id);

  await supabaseAdmin.from("notifications").insert({
    user_id: withdrawal.user_id,
    type: "withdrawal_processed",
    message: `Your withdrawal of ${withdrawal.amount} USDT has been sent.`
  });

  await logAdminAction(admin.id, "process_withdrawal", "withdrawal", params.id, { tx_hash: parsed.data.tx_hash });

  return NextResponse.json({ ok: true });
}
