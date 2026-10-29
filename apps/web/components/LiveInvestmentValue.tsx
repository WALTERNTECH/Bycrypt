"use client";

import { usePositionState } from "@/hooks/usePositionState";
import { formatUsdt, formatPct } from "@/lib/format";
import type { OpenPositionRow } from "@/lib/position";

// Ticks with the real price movement of the coin this position holds,
// measured from the price it was opened at and in the direction the
// position is pointing — so a SELL that is winning reads green.
export function LiveInvestmentValue({ row }: { row: OpenPositionRow }) {
  const { state, connected } = usePositionState(row);
  const up = state.pnl >= 0;

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${connected ? "live-dot bg-positive" : "bg-text-tertiary"}`}
        />
        <p className={`mono-num text-sm font-bold ${up ? "text-positive" : "text-negative"}`}>
          {formatUsdt(state.value, { withSymbol: true })}
        </p>
      </div>
      <p className={`mono-num text-[10px] font-bold ${up ? "text-positive" : "text-negative"}`}>
        {formatPct(state.pnlPct, { signed: true })}
      </p>
    </div>
  );
}
