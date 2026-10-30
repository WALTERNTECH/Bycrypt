"use client";

import { useLiveTickers } from "./useLiveTickers";
import { positionState, type OpenPositionRow, type PositionState } from "@/lib/position";
import type { Ticker } from "@/lib/market";

/**
 * Live state for one open position.
 *
 * Every component that shows a position's value goes through this, so the
 * home card, the chart, the close confirmation and the positions list all
 * read the same number from the same formula at the same instant.
 */
export function usePositionState(row: OpenPositionRow): {
  state: PositionState;
  ticker: Ticker | undefined;
  connected: boolean;
} {
  const { tickers, connected } = useLiveTickers(row.symbol ? [row.symbol] : []);
  const ticker = row.symbol ? tickers[row.symbol] : undefined;

  const state = positionState({
    principal: row.principal,
    accrued: row.accrued,
    side: row.side,
    entryPrice: row.entryPrice,
    livePrice: ticker?.lastPrice ?? null,
    fallbackPct: ticker?.priceChangePercent ?? null,
    targetGainPct: row.targetGainPct,
    startedAt: row.startedAt
  });

  return { state, ticker, connected };
}
