"use client";

import Link from "next/link";
import { usePositionState } from "@/hooks/usePositionState";
import { formatUsdt } from "@/lib/format";
import { ClosePositionButton } from "./ClosePositionButton";
import type { OpenPositionRow } from "@/lib/position";

/**
 * The home-screen view of the open position: what it settles at, and a
 * way out of it.
 *
 * It used to repeat the chart's own figures in a three-column bordered
 * grid directly underneath the chart, which is what made the screen look
 * assembled rather than designed. The chart carries the numbers; this
 * carries the exit.
 */
export function OpenPositionCard({ row }: { row: OpenPositionRow }) {
  const { state, connected } = usePositionState(row);
  const coin = row.symbol?.replace("USDT", "") ?? "Position";

  return (
    <div className="mt-4 rounded-lg bg-surface-2 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-base text-[11px] font-bold text-text-primary">
            {coin.slice(0, 4)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold text-text-primary">
              {coin} {row.side === "SELL" ? "sell" : "buy"}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${connected ? "live-dot bg-positive" : "bg-text-tertiary"}`}
              />
              <span className="text-[11px] text-text-tertiary">Open</span>
            </div>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-[11px] text-text-tertiary">Settles at</p>
          <p className="mono-num text-[15px] font-bold text-text-primary">
            {formatUsdt(state.settles, { withSymbol: true })}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1">
          <ClosePositionButton row={row} size="md" />
        </div>
        <Link
          href={row.symbol ? `/trade/${row.symbol}` : "/trade"}
          className="flex h-9 shrink-0 items-center rounded-lg bg-base px-3.5 text-[13px] font-semibold text-text-primary transition-colors hover:bg-surface-3"
        >
          Chart
        </Link>
      </div>
    </div>
  );
}
