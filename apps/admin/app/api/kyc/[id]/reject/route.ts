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
    .update({
      status: "rejected",
      rejection_reason: parsed.data.reason,
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.id
    })
    .eq("id", params.id);

  await supabaseAdmin.from("profiles").update({ kyc_status: "rejected" }).eq("id", submission.user_id);

  await supabaseAdmin.from("notifications").insert({
    user_id: submission.user_id,
    type: "kyc_rejected",
    message: `Your identity verification wasn't approved: ${parsed.data.reason}`
  });

  await logAdminAction(admin.id, "reject_kyc", "kyc_submission", params.id, { reason: parsed.data.reason });

  return NextResponse.json({ ok: true });
}
