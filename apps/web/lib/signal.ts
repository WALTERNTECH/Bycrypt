import type { Ticker } from "@/lib/binance";

/**
 * The automated trading signal.
 *
 * Two rules, from how the desk actually wants it to behave:
 *
 *  1. The side follows the market, not a bias. A coin that's climbing
 *     produces a BUY; a coin that's falling produces a SELL. The old
 *     version only ever ranked by best performer and only ever said
 *     "Buy", so it could never call a falling market.
 *
 *  2. The coin is chosen at random rather than always being the top
 *     mover, so the signal rotates across the board instead of parking
 *     on whatever happens to be leading that day.
 *
 * The randomness is seeded by a time bucket rather than Math.random, so
 * the pick is stable for everyone within the same window instead of
 * changing on every render or differing between two users looking at the
 * same screen a second apart.
 */

export type SignalSide = "BUY" | "SELL";

export interface Signal {
  symbol: string;
  displayName: string;
  side: SignalSide;
  /** The coin's own 24h move, unleveraged — what drove the call. */
  changePct: number;
}

/** How long a given pick stays put, in milliseconds. */
export const SIGNAL_WINDOW_MS = 15 * 60 * 1000;

/** Deterministic hash → the same bucket yields the same pick everywhere. */
function hash(n: number): number {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 0xffffffff;
}

export function currentBucket(now: number = Date.now()): number {
  return Math.floor(now / SIGNAL_WINDOW_MS);
}

/**
 * Picks the signal for the current window.
 *
 * `rows` supplies display names; `tickers` supplies live movement. Any
 * coin without a ticker yet is skipped rather than guessed at.
 */
export function pickSignal(
  rows: { symbol: string; display_name: string }[],
  tickers: Record<string, Ticker>,
  now: number = Date.now()
): Signal | null {
  const candidates = rows.filter((r) => tickers[r.symbol]);
  if (candidates.length === 0) return null;

  const bucket = currentBucket(now);
  const pick = candidates[Math.floor(hash(bucket) * candidates.length) % candidates.length];
  const t = tickers[pick.symbol];
  const changePct = t.priceChangePercent;

  return {
    symbol: pick.symbol,
    displayName: pick.display_name,
    // Flat counts as a buy — a dead-flat coin isn't a reason to sell.
    side: changePct >= 0 ? "BUY" : "SELL",
    changePct
  };
}
