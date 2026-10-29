import { SCAN_WINDOW, fetchCandles, type Candle, type ChartInterval } from "./binance";

/**
 * The market scan behind the BUY / SELL signal.
 *
 * It reads the window the user's timeframe chip names — four hours of
 * hourly candles for 4H, thirty daily candles for 1M — and reports which
 * way that window actually went. Nothing here is invented or weighted to
 * flatter a result: three independent reads of the same candles are taken
 * and the signal is only called strong when all three agree.
 *
 * Deliberately not a prediction. It states what the market has done over
 * the period selected, which is exactly what the interface claims it is.
 */

export interface MarketScan {
  side: "BUY" | "SELL";
  /** Net move across the scanned window, percent. */
  changePct: number;
  /** Share of candles in the window that closed up, 0-1. */
  upShare: number;
  /** Last close against the window's mean, percent. */
  vsMean: number;
  high: number;
  low: number;
  last: number;
  /** How many of the three reads point the same way as the signal. */
  agreement: number;
  strength: "weak" | "moderate" | "strong";
  /** Human label for the window read, e.g. "4 hours". */
  window: string;
  candles: number;
}

export function scanCandles(candles: Candle[], window: string): MarketScan | null {
  if (candles.length < 3) return null;

  const first = candles[0];
  const last = candles[candles.length - 1];
  if (!first.open || first.open <= 0) return null;

  const changePct = ((last.close - first.open) / first.open) * 100;
  const upShare = candles.filter((c) => c.close >= c.open).length / candles.length;
  const mean = candles.reduce((sum, c) => sum + c.close, 0) / candles.length;
  const vsMean = mean > 0 ? ((last.close - mean) / mean) * 100 : 0;
  const high = Math.max(...candles.map((c) => c.high));
  const low = Math.min(...candles.map((c) => c.low));

  // The net move decides direction. Where it is dead flat, the price's
  // position against the window's mean breaks the tie.
  const bullish = changePct > 0 || (changePct === 0 && vsMean >= 0);
  const side: MarketScan["side"] = bullish ? "BUY" : "SELL";

  // Three reads: the net move, the balance of up-closes, and where price
  // sits against the mean. Agreement is how many back the call.
  const reads = [changePct >= 0, upShare >= 0.5, vsMean >= 0];
  const agreement = reads.filter((read) => read === bullish).length;

  const magnitude = Math.abs(changePct);
  const strength: MarketScan["strength"] =
    agreement === 3 && magnitude >= 1.5 ? "strong" : agreement >= 2 && magnitude >= 0.4 ? "moderate" : "weak";

  return {
    side,
    changePct,
    upShare,
    vsMean,
    high,
    low,
    last: last.close,
    agreement,
    strength,
    window,
    candles: candles.length
  };
}

export async function scanMarket(symbol: string, timeframe: ChartInterval): Promise<MarketScan | null> {
  const spec = SCAN_WINDOW[timeframe];
  if (!spec) return null;
  try {
    // A few extra candles are requested so the window is full even when
    // the current one has only just opened.
    const candles = await fetchCandles(symbol, spec.interval, Math.max(spec.candles + 5, 30));
    return scanCandles(candles.slice(-spec.candles), spec.label);
  } catch {
    return null;
  }
}

export function scanHeadline(scan: MarketScan, coin: string): string {
  const dir = scan.changePct >= 0 ? "up" : "down";
  return `${coin} is ${dir} ${Math.abs(scan.changePct).toFixed(2)}% over ${scan.window}`;
}
