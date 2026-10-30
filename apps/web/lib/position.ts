import {
  moveFromEntry,
  normalizeSide,
  positionPct,
  positionPnl,
  positionValue,
  type Side
} from "./leverage";

/**
 * One function that answers "what is this position worth right now".
 *
 * It exists because that question used to be answered in six places with
 * five different formulas, which is how the interface ended up quoting a
 * figure the settlement never paid. Both the screens and the cash-out
 * route call this, so the number a user watches is the number that moves.
 */

/**
 * Simulated market mode.
 *
 * Off unless NEXT_PUBLIC_KRYPTON_SIM_MARKET is exactly "1". It exists to
 * answer one question that a real market will not answer on demand: does
 * a winning position actually credit the wallet. Waiting for a favourable
 * market to find out is not a test, and editing the figures by hand only
 * proves the figures can be edited.
 *
 * With it on, an open position drifts steadily in its own favour, so the
 * whole path — watch it climb, hit the target, auto-close, see the wallet
 * and total assets move — runs in a couple of minutes. The drift is
 * deterministic and derived from how long the position has been open, so
 * the browser and the server compute the same number and settlement pays
 * exactly what the screen showed.
 *
 * It is an environment variable rather than a flag in the code on
 * purpose: there is nothing to find and strip out later, and a
 * deployment that does not set it cannot be in this mode. Every screen
 * carries a banner while it is on, so a simulated figure can never be
 * mistaken for a real one.
 */
export const SIM_MARKET = process.env.NEXT_PUBLIC_KRYPTON_SIM_MARKET === "1";

/** Coin move, in percent, favouring whichever side the position took. */
export function simulatedMovePct(startedAt: string, side: Side): number {
  const openedMs = new Date(startedAt).getTime();
  if (!Number.isFinite(openedMs)) return 0;
  const minutes = Math.max(0, (Date.now() - openedMs) / 60_000);
  // A quarter of a percent of coin movement per minute is five percent of
  // position movement at this leverage: a +10% target lands in about two
  // minutes, +100% in twenty. Capped so the figures stay plausible.
  const magnitude = Math.min(minutes * 0.25, 12);
  return side === "SELL" ? -magnitude : magnitude;
}

export interface PositionInput {
  principal: number;
  /** Admin-granted return. A floor on settlement, but only when set. */
  accrued: number;
  side: Side;
  entryPrice: number | null;
  livePrice: number | null;
  /** Used only when the entry price is unknown: the coin's 24h change. */
  fallbackPct?: number | null;
  targetGainPct?: number | null;
  /** When the position opened. Required for simulated mode. */
  startedAt?: string | null;
}

export interface PositionState {
  /** The coin's move, in the direction the position is pointing. */
  movePct: number | null;
  /** The position's own percentage change against the stake. */
  pnlPct: number;
  /** Gain or loss in dollars. Signed. */
  pnl: number;
  /** What the position is worth at this instant. */
  value: number;
  /** What closing would actually credit — value, floored by any granted return. */
  settles: number;
  /** Where the move was measured from, so the UI can say so. */
  basis: "entry" | "24h" | "none" | "simulated";
  /** True once a target gain has been set and reached. */
  targetReached: boolean;
}

export function positionState(input: PositionInput): PositionState {
  const side = normalizeSide(input.side);
  const principal = input.principal;
  const accrued = Number.isFinite(input.accrued) ? input.accrued : 0;

  const simulating = SIM_MARKET && !!input.startedAt;
  const fromEntry = simulating ? null : moveFromEntry(input.entryPrice, input.livePrice);

  const basis: PositionState["basis"] = simulating
    ? "simulated"
    : fromEntry !== null
      ? "entry"
      : Number.isFinite(input.fallbackPct ?? NaN)
        ? "24h"
        : "none";

  const rawPct = simulating
    ? simulatedMovePct(input.startedAt as string, side)
    : fromEntry !== null
      ? fromEntry
      : basis === "24h"
        ? (input.fallbackPct as number)
        : 0;

  const value = positionValue(principal, rawPct, side);
  const pnl = positionPnl(principal, rawPct, side);
  const pnlPct = positionPct(principal, rawPct, side);

  // A granted return is a floor on what closing pays, not an addition to
  // it — otherwise a position could be paid its market gain twice.
  //
  // Positions opened before this change carry neither an entry price nor
  // a close-at target, and they were opened under rules where profit was
  // floored at zero and the stake could not be lost. Settlement is signed
  // now, which would put money already committed at a risk its owner
  // never agreed to — so a legacy position keeps the floor it was opened
  // under. New positions always carry a target, so this cannot catch one.
  const legacy =
    !simulating && input.entryPrice === null && (input.targetGainPct ?? null) === null;
  const floor = legacy ? principal + Math.max(accrued, 0) : accrued > 0 ? principal + accrued : null;
  const settles = floor === null ? value : Math.max(value, floor);

  const target = input.targetGainPct ?? null;
  // The epsilon is not a fudge. A price of entry x 1.005 lands on
  // 100.49999999999999 in binary floating point, so a position sitting
  // exactly on its +10% target computed to 9.999999999999998% and the
  // auto-close never fired. A billionth of a percentage point of
  // tolerance makes the boundary behave the way the number reads.
  const TARGET_EPSILON = 1e-9;
  const targetReached = target !== null && target > 0 && pnlPct >= target - TARGET_EPSILON;

  return {
    movePct: basis === "none" ? null : rawPct,
    pnlPct,
    pnl,
    value,
    settles,
    basis,
    targetReached
  };
}

/**
 * The shape every screen passes around for an open position.
 *
 * Positions grew three fields that matter to the maths — the side, the
 * entry price and the auto-close target — and passing them as four loose
 * props to six components is how they end up disagreeing. One row object
 * goes down instead.
 */
export interface OpenPositionRow {
  id: string;
  symbol: string | null;
  displayName?: string;
  principal: number;
  accrued: number;
  side: Side;
  entryPrice: number | null;
  targetGainPct: number | null;
  timeframe: string | null;
  startedAt: string;
}

/** Maps a raw `investments` row. Numerics arrive from Postgres as strings. */
export function mapPositionRow(row: any): OpenPositionRow {
  const num = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = parseFloat(String(v));
    return Number.isFinite(n) ? n : null;
  };
  return {
    id: String(row.id),
    symbol: (row.traded_symbol as string | null) ?? null,
    principal: num(row.amount) ?? 0,
    accrued: num(row.accrued_return) ?? 0,
    side: normalizeSide(row.side),
    entryPrice: num(row.entry_price),
    targetGainPct: num(row.target_gain_pct),
    timeframe: (row.timeframe as string | null) ?? null,
    startedAt: String(row.start_date ?? row.created_at ?? new Date().toISOString())
  };
}

/** Columns every position view needs. Kept here so a screen cannot
 *  silently select fewer and fall back to the wrong basis. */
export const POSITION_COLUMNS =
  "id, amount, accrued_return, traded_symbol, status, entry_price, start_date, side, target_gain_pct, timeframe";

/**
 * The gains a position can be set to close itself at.
 *
 * These are RETURN targets, not stake fractions — the row of chips under
 * the amount field used to be read as "how much of my wallet", which is a
 * different question entirely and is now asked separately and labelled.
 */
export const TARGET_GAIN_OPTIONS = [10, 25, 50, 100] as const;

export function isTargetGain(value: unknown): boolean {
  return typeof value === "number" && (TARGET_GAIN_OPTIONS as readonly number[]).includes(value);
}
