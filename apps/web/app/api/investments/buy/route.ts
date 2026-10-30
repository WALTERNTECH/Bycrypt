import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { pickTopGainer } from "@/lib/pickTopGainer";
import { fetchPrice, isChartInterval, type ChartInterval } from "@/lib/market";
import { isTargetGain } from "@/lib/position";
import { scanMarket } from "@/lib/scan";

const bodySchema = z.object({
  tier_id: z.number().int().positive(),
  amount: z.number().positive(),
  symbol: z.string().max(20).optional(),
  timeframe: z.string().max(4),
  target_gain_pct: z.number().positive()
});

/**
 * Opens a position from wallet funds.
 *
 * The transaction key is gone. It was a second secret guarding an action
 * that only moves money between two balances the same person owns, and
 * every order was one forgotten string away from being impossible.
 *
 * The SIDE is not accepted from the browser. The client runs the same
 * scan to show the user a signal, but the side recorded against the
 * position is the one this route derives from exchange data at the moment
 * the order lands — so the position is opened on the signal the platform
 * actually gave, not on whatever the request claimed. The response
 * reports the side used, and the client states it on the fill ticket.
 *
 * Positions run side by side. The only limit on opening one is the
 * wallet balance, which buy_investment() checks under a row lock so two
 * orders placed at the same instant cannot both spend it.
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  if (!isChartInterval(parsed.data.timeframe)) {
    return NextResponse.json({ error: "Pick a timeframe first." }, { status: 400 });
  }
  if (!isTargetGain(parsed.data.target_gain_pct)) {
    return NextResponse.json({ error: "Pick a target return." }, { status: 400 });
  }
  const timeframe = parsed.data.timeframe as ChartInterval;

  let tradedSymbol = parsed.data.symbol?.toUpperCase() ?? null;
  if (tradedSymbol) {
    // Trust only a symbol we actually list and that's active.
    const { data: match } = await supabase
      .from("market_symbols")
      .select("symbol")
      .eq("symbol", tradedSymbol)
      .eq("is_active", true)
      .maybeSingle();
    if (!match) tradedSymbol = null;
  }
  if (!tradedSymbol) {
    const { data: symbols } = await supabase.from("market_symbols").select("symbol").eq("is_active", true);
    tradedSymbol = await pickTopGainer((symbols ?? []).map((s) => s.symbol));
  }
  if (!tradedSymbol) {
    return NextResponse.json({ error: "No market is available to trade right now." }, { status: 503 });
  }

  // Re-scan server-side. This is the side the position is opened on.
  const scan = await scanMarket(tradedSymbol, timeframe);
  const side = scan?.side ?? "BUY";

  // Record what the coin cost at the moment the position opened: it is
  // the basis every P&L figure is measured from afterwards, so a position
  // without it has nothing honest to measure against.
  const entryPrice = await fetchPrice(tradedSymbol);

  const { data: investmentId, error } = await supabase.rpc("buy_investment", {
    p_tier_id: parsed.data.tier_id,
    p_amount: parsed.data.amount,
    p_traded_symbol: tradedSymbol,
    p_entry_price: entryPrice,
    p_side: side,
    p_target_gain_pct: parsed.data.target_gain_pct,
    p_timeframe: timeframe
  });

  if (error) {
    const messages: Record<string, string> = {
      insufficient_balance: "Your wallet balance is too low for that amount.",
      invalid_tier: "That plan isn't available.",
      invalid_amount: "Enter a valid amount.",
      not_authenticated: "Please log in again.",
    };
    const reason = Object.keys(messages).find((k) => error.message.includes(k));
    return NextResponse.json({ error: reason ? messages[reason] : "Could not complete that trade." }, { status: 400 });
  }

  return NextResponse.json(
    {
      investment_id: investmentId,
      traded_symbol: tradedSymbol,
      side,
      entry_price: entryPrice,
      target_gain_pct: parsed.data.target_gain_pct,
      timeframe,
      scan_change_pct: scan ? Number(scan.changePct.toFixed(2)) : null
    },
    { status: 201 }
  );
}
