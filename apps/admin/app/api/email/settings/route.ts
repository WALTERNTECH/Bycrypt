import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/auditLog";

// Only these keys may be written, so this endpoint can never be used to
// set arbitrary rows in the service-role-only table.
const ALLOWED = [
  "admin_notification_email",
  "admin_notification_from",
  "smtp_host",
  "smtp_port",
  "smtp_user",
  "smtp_pass",
  "resend_api_key"
] as const;

const bodySchema = z.object({
  key: z.enum(ALLOWED),
  value: z.string().max(500)
});

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  if (admin.role !== "super_admin") {
    return NextResponse.json({ error: "Only super_admin accounts can change mail settings." }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { key, value } = parsed.data;
  const supabaseAdmin = createAdminClient();

  if (value.trim() === "") {
    await supabaseAdmin.from("secure_config").delete().eq("key", key);
  } else {
    const { error } = await supabaseAdmin
      .from("secure_config")
      .upsert({ key, value: value.trim(), updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) return NextResponse.json({ error: "Could not save." }, { status: 500 });
  }

  // Never log the secret itself — only that it changed.
  await logAdminAction(admin.id, "update_mail_setting", "secure_config", key, {
    key,
    cleared: value.trim() === ""
  });

  return NextResponse.json({ ok: true });
}
