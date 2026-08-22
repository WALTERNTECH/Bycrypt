import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/auditLog";

const bodySchema = z.object({ accrued_return: z.number().min(0) });

// Growth is uncapped (min 40%, no max) — the admin sets the actual
// accrued amount directly, reflecting the real move of the coin the
// investment is trading.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const supabaseAdmin = createAdminClient();
  const { data: investment } = await supabaseAdmin
    .from("investments")
    .select("id, status")
    .eq("id", params.id)
    .maybeSingle();
  if (!investment) return NextResponse.json({ error: "Investment not found" }, { status: 404 });
  if (investment.status === "withdrawn") {
    return NextResponse.json({ error: "This investment has already been cashed out." }, { status: 400 });
  }

  const { error: updateError } = await supabaseAdmin
    .from("investments")
    .update({ accrued_return: parsed.data.accrued_return })
    .eq("id", params.id);
  if (updateError) return NextResponse.json({ error: "Update failed" }, { status: 500 });

  await logAdminAction(admin.id, "update_accrued_return", "investment", params.id, {
    accrued_return: parsed.data.accrued_return
  });

  return NextResponse.json({ ok: true });
}
