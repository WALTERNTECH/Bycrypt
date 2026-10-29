"use client";

import { usePositionState } from "@/hooks/usePositionState";
import { formatUsdt, formatPct } from "@/lib/format";
import type { OpenPositionRow } from "@/lib/position";

/**
 * What closing a position actually pays, computed the same way the server
 * computes it at settlement — so a user is never shown one number and
 * paid another.
 */
export function SettlementValue({ row }: { row: OpenPositionRow }) {
  const { state } = usePositionState(row);
  const up = state.pnl >= 0;

  return (
    <>
      <p className="mono-num mt-1 text-sm font-bold text-text-primary">
        {formatUsdt(state.settles, { withSymbol: true })}
      </p>
      <p className={`mono-num text-[10px] font-bold ${up ? "text-positive" : "text-negative"}`}>
        {formatPct(state.pnlPct, { signed: true })}
      </p>
    </>
  );
}
