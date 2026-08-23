"use client";

import { useLiveTickers } from "@/hooks/useLiveTickers";
import { formatUsdt } from "@/lib/format";

export interface LiveInvestment {
  amount: number;
  traded_symbol: string | null;
}

// The invested portion ticks live with the real price movement of each
// position's coin — this is unrealized/live tracking (an honest,
// market-linked number), separate from the admin-confirmed accrued
// return that actually gets paid out on cash-out (see Investments page).
export function LiveBalanceCard({ walletBalance, investments }: { walletBalance: number; investments: LiveInvestment[] }) {
  const symbols = Array.from(new Set(investments.map((i) => i.traded_symbol).filter((s): s is string => !!s)));
  const { tickers, connected } = useLiveTickers(symbols);

  const investedLive = investments.reduce((sum, inv) => {
    const t = inv.traded_symbol ? tickers[inv.traded_symbol] : undefined;
    const pct = t?.priceChangePercent ?? 0;
    return sum + inv.amount * (1 + pct / 100);
  }, 0);

  const principal = investments.reduce((sum, inv) => sum + inv.amount, 0);
  const liveDelta = investedLive - principal;
  const totalEquity = walletBalance + investedLive;

  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
        Estimated balance
        {symbols.length > 0 && (
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-positive animate-pulse" : "bg-text-secondary"}`} />
        )}
      </p>
      <p className="mono-num mt-1 text-3xl font-extrabold text-text-primary">
        {formatUsdt(totalEquity, { withSymbol: true })}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="text-text-secondary">
          Wallet: <span className="mono-num font-semibold text-text-primary">{formatUsdt(walletBalance, { withSymbol: true })}</span>
        </span>
        <span className="text-text-secondary">
          Invested: <span className="mono-num font-semibold text-text-primary">{formatUsdt(investedLive, { withSymbol: true })}</span>
        </span>
        {principal > 0 && (
          <span className={liveDelta >= 0 ? "text-positive" : "text-negative"}>
            {liveDelta >= 0 ? "+" : ""}
            {formatUsdt(liveDelta, { withSymbol: true })} live
          </span>
        )}
      </div>
    </div>
  );
}
