import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const supabaseAdmin = createAdminClient();
  await supabaseAdmin.from("notifications").update({ is_read: true }).eq("id", params.id).eq("admin_id", admin.id);

  return NextResponse.json({ ok: true });
}
