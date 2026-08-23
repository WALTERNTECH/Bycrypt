"use client";

import { useLiveTickers } from "@/hooks/useLiveTickers";
import { formatUsdt, formatPct } from "@/lib/format";

// Ticks live with the real price movement of the coin this investment
// is trading — an honest, market-linked "unrealized" figure. The
// admin-confirmed accrued return (shown alongside, smaller) is what
// actually gets paid out when cashing out.
export function LiveInvestmentValue({
  symbol,
  principal,
  confirmedAccrued
}: {
  symbol: string;
  principal: number;
  confirmedAccrued: number;
}) {
  const { tickers } = useLiveTickers([symbol]);
  const t = tickers[symbol];
  const livePct = t?.priceChangePercent ?? 0;
  const liveValue = principal * (livePct / 100);
  const up = livePct >= 0;

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${t ? "bg-positive animate-pulse" : "bg-text-secondary"}`} />
        <p className={`mono-num text-sm font-semibold ${up ? "text-positive" : "text-negative"}`}>
          {formatUsdt(liveValue, { withSymbol: true })}
        </p>
        <span className={`mono-num text-xs font-semibold ${up ? "text-positive" : "text-negative"}`}>
          {formatPct(livePct, { signed: true })}
        </span>
      </div>
      <p className="mt-0.5 text-[10px] text-text-secondary">
        Confirmed: <span className="mono-num text-positive">{formatUsdt(confirmedAccrued, { withSymbol: true })}</span>
      </p>
    </div>
  );
}
