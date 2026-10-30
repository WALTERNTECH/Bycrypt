import { NextResponse } from "next/server";
import { probeSources, fetchPrice, fetchCandles } from "@/lib/market";

export const dynamic = "force-dynamic";

/**
 * Which market venues this server can actually reach.
 *
 * It exists because the failure it reports was invisible for a week:
 * Binance answers 451 to the region these functions run in, every price
 * lookup returned null, and four separate features quietly fell back to
 * defaults without logging a thing. A regional block should be a reading
 * on a dial, not something inferred from a position that settled flat.
 *
 * Public on purpose — it exposes nothing but public exchange prices, and
 * an operator needs to be able to check it without signing in.
 */
export async function GET() {
  const started = Date.now();
  const sources = await probeSources("BTCUSDT");

  const price = await fetchPrice("BTCUSDT");
  let candles: number | null = null;
  try {
    candles = (await fetchCandles("BTCUSDT", "1h", 24)).length;
  } catch {
    candles = null;
  }

  const reachable = Object.entries(sources)
    .filter(([, v]) => v !== null)
    .map(([k]) => k);

  const ok = price !== null && candles !== null && candles > 0;

  return NextResponse.json(
    {
      ok,
      region: process.env.VERCEL_REGION ?? "local",
      sources,
      reachable,
      resolved_price: price,
      candles_returned: candles,
      took_ms: Date.now() - started,
      note: ok
        ? "Prices and candles resolve. Orders, settlement and deposits can all be valued."
        : "No venue is answering. Orders open without an entry price, settlement credits the stake exactly, and deposits cannot be priced."
    },
    { status: ok ? 200 : 503 }
  );
}
