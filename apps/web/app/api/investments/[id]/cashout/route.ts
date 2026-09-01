import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchTickers } from "@/lib/binance";
import { leveragedProfit } from "@/lib/leverage";

const REASON_MESSAGES: Record<string, string> = {
  not_authenticated: "Please log in again.",
  not_found: "Investment not found.",
  already_withdrawn: "This investment has already been cashed out."
};

/**
 * Closes a position and moves principal + profit into the wallet.
 *
 * The profit is recomputed here, server-side, from live exchange data
 * using the same formula the interface displays with — so the figure a
 * user watched and the figure they are paid are the same number.
 *
 * It is deliberately NOT taken from the request body. A client-supplied
 * profit would let anyone mint wallet balance by posting a large value,
 * and this credits real money.
 *
 * The position's own row is read with the service role purely to learn
 * which symbol it holds; the settlement itself runs through the
 * auth.uid()-scoped RPC, so a user still cannot close someone else's
 * position.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Work out what the position is currently worth on the market.
  let marketProfit = 0;
  try {
    const admin = createAdminClient();
    const { data: inv } = await admin
      .from("investments")
      .select("amount, traded_symbol, user_id, status")
      .eq("id", params.id)
      .maybeSingle();

    if (inv && inv.user_id === user.id && inv.status !== "withdrawn" && inv.traded_symbol) {
      const principal = parseFloat(String(inv.amount));
      const tickers = await fetchTickers([inv.traded_symbol]);
      const t = tickers[inv.traded_symbol];
      if (t) marketProfit = leveragedProfit(principal, t.priceChangePercent);
    }
  } catch {
    // Exchange unreachable — settle on the admin-confirmed figure alone
    // rather than blocking the user from closing their position.
    marketProfit = 0;
  }

  const { data: settled, error } = await supabase.rpc("cash_out_investment", {
    p_investment_id: params.id,
    p_market_profit: Number.isFinite(marketProfit) ? marketProfit : 0
  });

  if (error) {
    const reason = Object.keys(REASON_MESSAGES).find((k) => error.message.includes(k));
    return NextResponse.json(
      { error: reason ? REASON_MESSAGES[reason] : "Could not close that position." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, credited: settled });
}
