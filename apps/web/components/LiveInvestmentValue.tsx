"use client";

import { useLiveTickers } from "@/hooks/useLiveTickers";
import { formatUsdt, formatPct } from "@/lib/format";
import { leveragedValue, leveragedPct } from "@/lib/leverage";

// Ticks with the real price movement of the coin this position holds —
// an honest, market-linked unrealized figure. The admin-confirmed
// accrued return is what actually settles on close, so it is never
// conflated with this number.
export function LiveInvestmentValue({
  symbol,
  principal,
  confirmedAccrued
}: {
  symbol: string;
  principal: number;
  confirmedAccrued: number;
}) {
  const { tickers, connected } = useLiveTickers([symbol]);
  const t = tickers[symbol];
  const rawPct = t?.priceChangePercent ?? 0;
  const liveValue = leveragedValue(principal, rawPct);
  // The percentage shown is the position's move, not the coin's — a
  // coin figure beside a position value would contradict it.
  const livePct = leveragedPct(principal, rawPct);
  const up = rawPct >= 0;

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${connected ? "live-dot bg-positive" : "bg-text-tertiary"}`} />
        <p className={`mono-num text-sm font-bold ${up ? "text-positive" : "text-negative"}`}>
          {formatUsdt(liveValue, { withSymbol: true })}
        </p>
      </div>
      <p className={`mono-num text-[10px] font-bold ${up ? "text-positive" : "text-negative"}`}>
        {formatPct(livePct, { signed: true })}
      </p>
    </div>
  );
}
