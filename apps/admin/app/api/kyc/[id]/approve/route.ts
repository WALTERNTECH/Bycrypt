import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/auditLog";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const supabaseAdmin = createAdminClient();
  const { data: submission } = await supabaseAdmin
    .from("kyc_submissions")
    .select("id, user_id, status")
    .eq("id", params.id)
    .maybeSingle();
  if (!submission) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (submission.status !== "pending") {
    return NextResponse.json({ error: "Only pending submissions can be decided." }, { status: 400 });
  }

  await supabaseAdmin
    .from("kyc_submissions")
    .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: admin.id })
    .eq("id", params.id);

  await supabaseAdmin.from("profiles").update({ kyc_status: "approved" }).eq("id", submission.user_id);

  await supabaseAdmin.from("notifications").insert({
    user_id: submission.user_id,
    type: "kyc_approved",
    message: "Your identity has been verified. Deposits and trading are now unlocked."
  });

  await logAdminAction(admin.id, "approve_kyc", "kyc_submission", params.id);

  return NextResponse.json({ ok: true });
}
