import type { Ticker } from "@/lib/binance";

/**
 * The automated trading signal.
 *
 * The signal is personalised to what the user can actually do, because a
 * call they can't act on is worse than no call:
 *
 *   No open position  — they can only buy, so the signal picks from
 *                       coins that are climbing and says BUY.
 *   Position open     — they can only close, so the signal watches the
 *                       coin they hold and says SELL when it turns down.
 *
 * That still produces both sides over time and rotates across the board
 * via a random pick, but it can never tell someone to sell a coin they
 * don't own — which is exactly what left the Sell button dead on arrival.
 *
 * The randomness is seeded from a time bucket rather than Math.random,
 * so the pick is stable for everyone inside the same window instead of
 * changing on every render.
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
 * `heldSymbol` is the coin of the user's open position, if any. Pass null
 * when nothing is open.
 */
export function pickSignal(
  rows: { symbol: string; display_name: string }[],
  tickers: Record<string, Ticker>,
  heldSymbol: string | null = null,
  now: number = Date.now()
): Signal | null {
  const nameOf = (sym: string) => rows.find((r) => r.symbol === sym)?.display_name ?? sym.replace("USDT", "");

  // Holding something: the only available action is closing it, so the
  // call is about that coin and turns to SELL when it moves against them.
  if (heldSymbol) {
    const t = tickers[heldSymbol];
    if (!t) return null;
    return {
      symbol: heldSymbol,
      displayName: nameOf(heldSymbol),
      side: t.priceChangePercent < 0 ? "SELL" : "BUY",
      changePct: t.priceChangePercent
    };
  }

  // Nothing open: only a buy is possible, so choose among risers.
  const candidates = rows.filter((r) => {
    const t = tickers[r.symbol];
    return t && t.priceChangePercent > 0;
  });
  if (candidates.length === 0) return null;

  const bucket = currentBucket(now);
  const pick = candidates[Math.floor(hash(bucket) * candidates.length) % candidates.length];
  const t = tickers[pick.symbol];

  return {
    symbol: pick.symbol,
    displayName: pick.display_name,
    side: "BUY",
    changePct: t.priceChangePercent
  };
}
