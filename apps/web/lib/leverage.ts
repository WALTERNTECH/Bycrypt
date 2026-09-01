/**
 * Position leverage.
 *
 * A position tracks the traded coin's move at 1:20 against the capital
 * the user committed — a 1% move on the coin is a 20% move on the
 * position. Every figure in the app derives from the helpers here so the
 * ratio exists in exactly one place; changing this constant changes
 * every balance, delta, percentage and payout together.
 *
 * Deliberately internal: nothing in the interface names the ratio or the
 * word "leverage". It shapes the numbers, it is not a label.
 *
 * This is used for both the live display AND settlement. The cash-out
 * route recomputes the profit server-side from exchange data at close
 * time, so what a user is shown and what they are paid come from the
 * same formula. The browser never supplies the figure.
 */
export const LEVERAGE_RATIO = 20;

/**
 * Current indicative value of `principal` given the coin's raw % move.
 * Floored at zero: at 1:20 a 5% adverse move wipes the position out, and
 * a custody balance must never render as a negative number.
 */
export function leveragedValue(principal: number, rawPct: number): number {
  return Math.max(0, principal * (1 + (rawPct * LEVERAGE_RATIO) / 100));
}

/**
 * Profit above principal — what settlement pays on top of the stake.
 * Never negative: a losing position returns the stake rather than
 * clawing back the rest of the wallet.
 */
export function leveragedProfit(principal: number, rawPct: number): number {
  return Math.max(0, leveragedValue(principal, rawPct) - principal);
}

/**
 * The position's percentage move, derived from the floored value rather
 * than the raw multiplication. Past a total loss the two diverge — a
 * -10% coin move is -200% multiplied out but the position can only lose
 * all of itself — and printing -200% beside a $0.00 value would
 * contradict it. Deriving from the value keeps the pair consistent and
 * bottoms out at -100%.
 */
export function leveragedPct(principal: number, rawPct: number): number {
  if (principal <= 0) return 0;
  return ((leveragedValue(principal, rawPct) - principal) / principal) * 100;
}
