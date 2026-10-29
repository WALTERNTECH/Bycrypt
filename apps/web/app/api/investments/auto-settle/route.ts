import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mapPositionRow, POSITION_COLUMNS } from "@/lib/position";
import { settlePosition, valuePosition } from "@/lib/settle";

/**
 * Closes the caller's open position if it has reached the gain it was set
 * to close at.
 *
 * The browser asks; the server decides. The client watches the live price
 * and calls this when it believes the target has been hit, but the target
 * is re-checked here against a price this route fetches itself — so a
 * forged call cannot close a position early, and a client that is merely
 * out of date cannot close one that has slipped back below target.
 *
 * It is safe to call repeatedly: with nothing open, or nothing at target,
 * it reports closed: false and changes nothing.
 */
export async function POST(_req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: open } = await supabase
    .from("investments")
    .select(POSITION_COLUMNS)
    .eq("user_id", user.id)
    .neq("status", "withdrawn")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!open) return NextResponse.json({ closed: false, reason: "no_open_position" });

  const row = mapPositionRow(open);
  if (row.targetGainPct === null || row.targetGainPct <= 0) {
    return NextResponse.json({ closed: false, reason: "no_target_set" });
  }

  const { state } = await valuePosition(row);
  if (!state.targetReached) {
    return NextResponse.json({
      closed: false,
      reason: "target_not_reached",
      pnl_pct: Number(state.pnlPct.toFixed(2)),
      target_pct: row.targetGainPct
    });
  }

  const outcome = await settlePosition(supabase, row);
  if (!outcome.ok) return NextResponse.json({ closed: false, error: outcome.error }, { status: 400 });

  return NextResponse.json({
    closed: true,
    credited: outcome.credited,
    pnl: outcome.pnl,
    target_pct: row.targetGainPct
  });
}
