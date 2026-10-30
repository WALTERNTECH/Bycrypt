/**
 * Position maths.
 *
 * A position tracks its coin at 1:20 against the capital committed — a 1%
 * move on the coin is a 20% move on the position. Every figure in the app
 * derives from the helpers here so the ratio exists in exactly one place.
 *
 * Two things changed here, and both were bugs rather than preferences:
 *
 *   A position has a SIDE. The app hands the user a BUY or SELL signal, so
 *   a SELL position has to gain when the price falls. Before this, profit
 *   only ever came from upward moves, which made the sell signal
 *   decorative.
 *
 *   P&L can be NEGATIVE. Profit used to be floored at zero, so a losing
 *   position returned the stake intact and closing it changed the wallet
 *   by nothing at all. The position's *value* is still floored at zero —
 *   a position can lose all of itself but must never reach into the rest
 *   of the wallet — but the P&L against the stake is now signed.
 *
 * These are used for both display AND settlement. The cash-out route
 * recomputes value server-side from exchange data at close time, so what
 * a user watches and what they are paid come from the same formula. The
 * browser never supplies the figure.
 */
/**
 * Leverage is set by the timeframe the position was opened on.
 *
 * A single ratio for every timeframe was the problem behind both
 * complaints about this. Bitcoin moves roughly 0.8% in four hours and
 * roughly 13% in a month, so one multiplier cannot make a +25% target
 * sensibly reachable on both — at 20x a four-hour position needed a move
 * the market rarely makes that fast, while the same 20x turned ordinary
 * minute-to-minute noise into double-digit swings the moment it opened.
 *
 * These are sized so a mid-range target lands somewhere inside the window
 * the user actually chose, and so the day-to-day movement along the way
 * is proportionate to how long they intend to hold.
 */
export const TIMEFRAME_LEVERAGE: Record<string, number> = {
  "4h": 15,
  "1d": 8,
  "1w": 4,
  "1M": 2
};

/** Used where the timeframe is unknown — positions opened before it was
 *  recorded, and anything that does not name one. */
export const LEVERAGE_RATIO = 8;

export function leverageFor(timeframe: string | null | undefined): number {
  if (!timeframe) return LEVERAGE_RATIO;
  return TIMEFRAME_LEVERAGE[timeframe] ?? LEVERAGE_RATIO;
}

export type Side = "BUY" | "SELL";

export function normalizeSide(value: unknown): Side {
  return String(value ?? "").toUpperCase() === "SELL" ? "SELL" : "BUY";
}

/** The coin's move as the position experiences it. A SELL is the mirror. */
export function directionalPct(rawPct: number, side: Side = "BUY"): number {
  return side === "SELL" ? -rawPct : rawPct;
}

/**
 * The coin's move since the position opened. This — not the coin's 24h
 * change — is the only honest basis for "how is my position doing": the
 * 24h window describes hours the user may never have been in, and it made
 * a brand-new position open at an instant profit or loss.
 */
export function moveFromEntry(entryPrice: number | null, livePrice: number | null): number | null {
  if (!entryPrice || !livePrice || entryPrice <= 0) return null;
  return ((livePrice - entryPrice) / entryPrice) * 100;
}

/**
 * What the position is worth now. Floored at zero: at 1:20 a 5% adverse
 * move wipes it out, and a balance must never render negative.
 */
export function positionValue(
  principal: number,
  rawPct: number,
  side: Side = "BUY",
  leverage: number = LEVERAGE_RATIO
): number {
  return Math.max(0, principal * (1 + (directionalPct(rawPct, side) * leverage) / 100));
}

/** Gain or loss against the stake. Negative when the position is down. */
export function positionPnl(
  principal: number,
  rawPct: number,
  side: Side = "BUY",
  leverage: number = LEVERAGE_RATIO
): number {
  return positionValue(principal, rawPct, side, leverage) - principal;
}

/**
 * The position's percentage move, derived from the floored value rather
 * than the raw multiplication. Past a total loss the two diverge — a 10%
 * adverse coin move is -200% multiplied out, but the position can only
 * lose all of itself — and printing -200% beside a $0.00 value would
 * contradict it. Deriving from the value keeps the pair consistent and
 * bottoms out at -100%.
 */
export function positionPct(
  principal: number,
  rawPct: number,
  side: Side = "BUY",
  leverage: number = LEVERAGE_RATIO
): number {
  if (principal <= 0) return 0;
  return (positionPnl(principal, rawPct, side, leverage) / principal) * 100;
}

/** The coin move that would put a position at `targetPct` gain. */
export function coinMoveForTarget(targetPct: number, leverage: number = LEVERAGE_RATIO): number {
  return targetPct / leverage;
}
