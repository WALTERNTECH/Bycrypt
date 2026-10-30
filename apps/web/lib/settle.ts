import { fetchPrice, fetchTickers } from "./market";
import { positionState, type OpenPositionRow } from "./position";

/**
 * Server-side settlement.
 *
 * The position's value is recomputed here from live exchange data using
 * the same formula the interface displays with, so the figure a user
 * watched and the figure they are paid are the same number.
 *
 * It is deliberately NOT taken from the request body. A client-supplied
 * value would let anyone mint wallet balance by posting a large one, and
 * this credits real money.
 */

export interface SettleOutcome {
  ok: boolean;
  error?: string;
  credited?: number;
  pnl?: number;
  exitPrice?: number | null;
}

const REASON_MESSAGES: Record<string, string> = {
  not_authenticated: "Please log in again.",
  not_found: "Position not found.",
  already_withdrawn: "This position has already been closed."
};

/** Prices a position from live market data. Returns null market value
 *  when no price basis could be established at all. */
export async function valuePosition(row: OpenPositionRow, simulated = false) {
  let livePrice: number | null = null;
  let fallbackPct: number | null = null;

  if (row.symbol) {
    livePrice = await fetchPrice(row.symbol);
    // Positions opened before entry prices were recorded have nothing to
    // measure from, so the coin's 24h move stands in.
    if (row.entryPrice === null) {
      try {
        const tickers = await fetchTickers([row.symbol]);
        const t = tickers[row.symbol];
        if (t) fallbackPct = t.priceChangePercent;
      } catch {
        /* leave it unknown */
      }
    }
  }

  const state = positionState({
    principal: row.principal,
    accrued: row.accrued,
    side: row.side,
    entryPrice: row.entryPrice,
    livePrice,
    fallbackPct,
    targetGainPct: row.targetGainPct,
    startedAt: row.startedAt,
    timeframe: row.timeframe,
    simulated
  });

  return { state, livePrice };
}

/**
 * Closes the position and moves its settled value into the wallet.
 *
 * `supabase` must be the caller's own client, not the service role: RLS
 * on investments restricts SELECT to the owner, and cash_out_investment
 * checks auth.uid() against the row's owner, so ownership is enforced
 * twice without the admin key being anywhere near this path.
 */
export async function settlePosition(
  supabase: any,
  row: OpenPositionRow,
  simulated = false
): Promise<SettleOutcome> {
  const { state, livePrice } = await valuePosition(row, simulated);

  // An unreachable exchange settles on the amount invested plus any grant
  // rather than blocking the user out of their own position — that is
  // what passing a null market value tells the database to do.
  const marketValue = state.basis === "none" ? null : Number(state.value.toFixed(6));

  const { data: credited, error } = await supabase.rpc("cash_out_investment", {
    p_investment_id: row.id,
    p_market_value: marketValue,
    p_exit_price: livePrice
  });

  if (error) {
    const reason = Object.keys(REASON_MESSAGES).find((k) => error.message.includes(k));
    return { ok: false, error: reason ? REASON_MESSAGES[reason] : "Could not close that position." };
  }

  const total = typeof credited === "number" ? credited : parseFloat(String(credited ?? 0));
  return { ok: true, credited: total, pnl: total - row.principal, exitPrice: livePrice };
}

/* ------------------------------------------------------------------ */
/* Closing several at once                                             */
/* ------------------------------------------------------------------ */

export type CloseScope = "all" | "winning" | "losing" | "target";

export interface BulkOutcome {
  closed: number;
  skipped: number;
  credited: number;
  pnl: number;
  ids: string[];
  errors: string[];
}

/**
 * Closes every open position matching a scope.
 *
 * Each one is valued immediately before it settles rather than from a
 * figure taken when the list was drawn. On a screen with several
 * positions open, seconds pass between the user pressing the button and
 * the last one settling — and a position that was winning when the list
 * rendered may not be by the time its turn comes. Deciding from a stale
 * reading would close a losing position under "close winning".
 *
 * Sequential on purpose. Every settlement adds to the same wallet row, so
 * running them in parallel would have them queue on that lock anyway,
 * and it would multiply the price lookups against the venues at the same
 * instant. One at a time is slower to finish and easier to reason about,
 * and a failure part-way leaves every position before it correctly
 * settled rather than an unknown subset.
 */
export async function settleMany(
  supabase: any,
  rows: OpenPositionRow[],
  simulated: boolean,
  scope: CloseScope
): Promise<BulkOutcome> {
  const out: BulkOutcome = { closed: 0, skipped: 0, credited: 0, pnl: 0, ids: [], errors: [] };

  for (const row of rows) {
    const { state } = await valuePosition(row, simulated);

    const matches =
      scope === "all"
        ? true
        : scope === "winning"
          ? state.pnl > 0
          : scope === "losing"
            ? state.pnl < 0
            : state.targetReached;

    if (!matches) {
      out.skipped += 1;
      continue;
    }

    const result = await settlePosition(supabase, row, simulated);
    if (!result.ok) {
      out.errors.push(result.error ?? "Could not close one position.");
      continue;
    }

    out.closed += 1;
    out.credited += result.credited ?? 0;
    out.pnl += result.pnl ?? 0;
    out.ids.push(row.id);
  }

  return out;
}
