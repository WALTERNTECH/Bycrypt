import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/auditLog";

const bodySchema = z.object({
  log_date: z.string(),
  total_trading_pnl: z.number(),
  total_accrued_liability: z.number(),
  notes: z.string().nullable().optional()
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const supabaseAdmin = createAdminClient();
  const { data: log, error } = await supabaseAdmin
    .from("bot_performance_logs")
    .insert(parsed.data)
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: "Failed to log snapshot" }, { status: 500 });

  await logAdminAction(admin.id, "log_bot_performance", "bot_performance_log", log.id, parsed.data);

  return NextResponse.json({ ok: true });
}
