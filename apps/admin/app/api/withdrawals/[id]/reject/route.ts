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

  await supabaseAdmin.from("notifications").insert({
    user_id: withdrawal.user_id,
    type: "withdrawal_rejected",
    message: `Your withdrawal request for ${withdrawal.amount} USDT was rejected: ${parsed.data.reason}`
  });

  await logAdminAction(admin.id, "reject_withdrawal", "withdrawal", params.id, { reason: parsed.data.reason });

  return NextResponse.json({ ok: true });
}
