import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mapPositionRow, POSITION_COLUMNS } from "@/lib/position";
import { settleMany } from "@/lib/settle";

/**
 * Closes any of the caller's positions that have reached the gain they
 * were set to close at.
 *
 * The browser asks; the server decides. The client watches live figures
 * and calls this when it believes a target has been hit, but every
 * position is re-valued here against a price this route fetches itself —
 * so a forged call cannot close one early, and a client that is merely
 * out of date cannot close one that has slipped back below target.
 *
 * It sweeps all open positions rather than the single one it used to,
 * since several can now run at once and more than one can cross its
 * target between two polls.
 *
 * Safe to call repeatedly: with nothing open, or nothing at target, it
 * reports closed: 0 and changes nothing.
 */
export async function POST(_req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const [{ data: open }, { data: profile }] = await Promise.all([
    supabase
      .from("investments")
      .select(POSITION_COLUMNS)
      .eq("user_id", user.id)
      .neq("status", "withdrawn")
      .not("target_gain_pct", "is", null)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("is_simulated").eq("id", user.id).maybeSingle()
  ]);

  const rows = (open ?? []).map(mapPositionRow).filter((r) => (r.targetGainPct ?? 0) > 0);
  if (rows.length === 0) return NextResponse.json({ closed: 0, reason: "nothing_to_settle" });

  const outcome = await settleMany(supabase, rows, profile?.is_simulated === true, "target");

  return NextResponse.json({
    closed: outcome.closed,
    credited: outcome.credited,
    pnl: outcome.pnl,
    ids: outcome.ids
  });
}
