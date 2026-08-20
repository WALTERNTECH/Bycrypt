import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/auditLog";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const supabaseAdmin = createAdminClient();
  const { data: withdrawal } = await supabaseAdmin
    .from("withdrawals")
    .select("id, status")
    .eq("id", params.id)
    .maybeSingle();
  if (!withdrawal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (withdrawal.status !== "pending") {
    return NextResponse.json({ error: "Only pending requests can be approved." }, { status: 400 });
  }

  await supabaseAdmin.from("withdrawals").update({ status: "approved", admin_id: admin.id }).eq("id", params.id);
  await logAdminAction(admin.id, "approve_withdrawal", "withdrawal", params.id);

  return NextResponse.json({ ok: true });
}
