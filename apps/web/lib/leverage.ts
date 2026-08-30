/**
 * Position leverage.
 *
 * A position tracks the traded coin's move at 1:50 against the capital
 * the user committed — a 1% move on the coin is a 50% move on the
 * position. Every live figure in the app derives from the helpers here
 * so the ratio exists in exactly one place; changing this constant
 * changes every balance, delta and percentage together.
 *
 * Deliberately internal: nothing in the interface names the ratio or the
 * word "leverage". It shapes the numbers, it is not a label.
 *
 * Scope: this applies only to the *live, unrealized* tracking figure.
 * The payable amount on close is investments.accrued_return, which
 * support sets by hand and which this never touches — keeping the
 * indicative number and the settlement number strictly separate.
 */
export const LEVERAGE_RATIO = 50;

/**
 * Current indicative value of `principal` given the coin's raw % move.
 * Floored at zero: at 1:50 a 2% adverse move wipes the position out, and
 * a custody balance must never render as a negative number.
 */
export function leveragedValue(principal: number, rawPct: number): number {
  return Math.max(0, principal * (1 + (rawPct * LEVERAGE_RATIO) / 100));
}

/**
 * The position's percentage move, derived from the floored value rather
 * than the raw multiplication. Past a total loss the two diverge — a -5%
 * coin move is -250% multiplied out but the position can only lose all
 * of itself — and printing -250% beside a $0.00 value would contradict
 * it. Deriving from the value keeps the pair consistent and bottoms out
 * at -100%.
 */
export function leveragedPct(principal: number, rawPct: number): number {
  if (principal <= 0) return 0;
  return ((leveragedValue(principal, rawPct) - principal) / principal) * 100;
}
