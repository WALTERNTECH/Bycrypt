import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mapPositionRow, POSITION_COLUMNS } from "@/lib/position";
import { valuePosition } from "@/lib/settle";

export const dynamic = "force-dynamic";

/**
 * What the caller's open position is worth, computed here.
 *
 * It exists because the browser and the server were reading different
 * exchanges. The entry price is recorded server-side from whichever venue
 * answers — Bybit and Binance are blocked from this region, so it lands on
 * OKX or Coinbase — while the screen priced the position from the Binance
 * socket. Those quotes differ by up to a fifth of a percent, and leverage
 * multiplies that straight into the opening figure: a position opened at
 * a real 0.00% displayed several percent of loss before the market had
 * moved at all.
 *
 * Measuring both ends against the same feed is the only way that figure
 * can be zero at open, so the measurement happens in one place, and it is
 * the same place settlement reads from. What the screen shows and what the
 * wallet receives are now the same computation rather than two that agree
 * on a good day.
 */
export async function GET() {
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
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("profiles").select("is_simulated, wallet_balance").eq("id", user.id).maybeSingle()
  ]);

  if (!open) return NextResponse.json({ position: null, wallet: Number(profile?.wallet_balance ?? 0) });

  const row = mapPositionRow(open);
  const { state, livePrice } = await valuePosition(row, profile?.is_simulated === true);

  return NextResponse.json({
    wallet: Number(profile?.wallet_balance ?? 0),
    position: {
      id: row.id,
      symbol: row.symbol,
      side: row.side,
      timeframe: row.timeframe,
      principal: row.principal,
      entry_price: row.entryPrice,
      live_price: livePrice,
      target_gain_pct: row.targetGainPct,
      leverage: state.leverage,
      basis: state.basis,
      move_pct: state.movePct,
      pnl: state.pnl,
      pnl_pct: state.pnlPct,
      value: state.value,
      settles: state.settles,
      target_reached: state.targetReached
    }
  });
}
