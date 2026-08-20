import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/auditLog";

const bodySchema = z.object({ value: z.string().min(1).max(500) });

export async function PUT(req: NextRequest, { params }: { params: { key: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  if (admin.role !== "super_admin") {
    return NextResponse.json({ error: "Only super_admin accounts can edit config." }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid value" }, { status: 400 });

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin
    .from("platform_config")
    .update({ value: parsed.data.value, updated_at: new Date().toISOString() })
    .eq("key", params.key);
  if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });

  await logAdminAction(admin.id, "update_config", "platform_config", undefined, {
    key: params.key,
    value: parsed.data.value
  });

  return NextResponse.json({ ok: true });
}
