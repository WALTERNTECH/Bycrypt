"use client";

import { useLiveTickers } from "./useLiveTickers";
import { useSimulatedAccount } from "@/components/SimulationProvider";
import { useLivePosition } from "@/components/PositionLiveProvider";
import { positionState, type OpenPositionRow, type PositionState } from "@/lib/position";
import type { Ticker } from "@/lib/market";

/**
 * Live state for one open position.
 *
 * Every component that shows a position's value goes through this, so the
 * home card, the chart, the close confirmation and the positions list all
 * read the same number at the same instant.
 *
 * The number itself comes from the server. The browser and the server were
 * pricing from different exchanges — entry recorded from whichever venue
 * answers the server, live price read from the Binance socket — and
 * leverage turned that quarter-percent spread into several percent of
 * phantom loss the moment a position opened. Measuring both ends against
 * one feed is the only way a fresh position reads zero.
 *
 * The local computation stays as the fallback for the second before the
 * first poll lands, and for a row that is not the one being polled.
 */
export function usePositionState(row: OpenPositionRow): {
  state: PositionState;
  ticker: Ticker | undefined;
  connected: boolean;
} {
  const { tickers, connected } = useLiveTickers(row.symbol ? [row.symbol] : []);
  const ticker = row.symbol ? tickers[row.symbol] : undefined;
  const simulated = useSimulatedAccount();
  const live = useLivePosition(row.id || null);

  if (live) return { state: live.state, ticker, connected };

  const state = positionState({
    principal: row.principal,
    accrued: row.accrued,
    side: row.side,
    entryPrice: row.entryPrice,
    livePrice: ticker?.lastPrice ?? null,
    fallbackPct: ticker?.priceChangePercent ?? null,
    targetGainPct: row.targetGainPct,
    startedAt: row.startedAt,
    timeframe: row.timeframe,
    simulated
  });

  return { state, ticker, connected };
}
