"use client";

import { useLiveTickers } from "@/hooks/useLiveTickers";
import { formatUsdt, formatPct } from "@/lib/format";

export interface LiveInvestment {
  amount: number;
  accrued: number;
  traded_symbol: string | null;
}

// Krypton keeps two balances, and the UI must never blur them:
//
//   Wallet   — settled USDT. What deposits land in and what withdrawals
//              are paid from. Static.
//   Trading  — capital currently in an open position. Moves with the
//              coin. Not withdrawable until the position is closed.
//
// The trading figure ticks with the real 24h move of the held coin
// (honest unrealized tracking); the admin-confirmed accrued return is
// what actually settles on close, so it's shown alongside.
export function LiveBalanceCard({
  walletBalance,
  investments
}: {
  walletBalance: number;
  investments: LiveInvestment[];
}) {
  const symbols = Array.from(new Set(investments.map((i) => i.traded_symbol).filter((s): s is string => !!s)));
  const { tickers, connected } = useLiveTickers(symbols);

  const principal = investments.reduce((sum, inv) => sum + inv.amount, 0);
  const confirmedValue = investments.reduce((sum, inv) => sum + inv.amount + inv.accrued, 0);

  const tradingLive = investments.reduce((sum, inv) => {
    const t = inv.traded_symbol ? tickers[inv.traded_symbol] : undefined;
    const pct = t?.priceChangePercent ?? 0;
    return sum + inv.amount * (1 + pct / 100);
  }, 0);

  const liveDelta = tradingLive - principal;
  const livePct = principal > 0 ? (liveDelta / principal) * 100 : 0;
  const up = liveDelta >= 0;
  const hasPosition = principal > 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-surface-2 to-surface shadow-card">
      {/* Total equity */}
      <div className="px-4 pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Total equity</p>
        <p className="mono-num mt-1 text-[32px] font-extrabold leading-none text-text-primary">
          {formatUsdt(walletBalance + confirmedValue, { withSymbol: true })}
        </p>
      </div>

      {/* Wallet vs Trading */}
      <div className="mt-4 grid grid-cols-2 divide-x divide-border border-t border-border">
        <div className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-text-tertiary" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Wallet</p>
          </div>
          <p className="mono-num mt-1 text-xl font-extrabold text-text-primary">
            {formatUsdt(walletBalance, { withSymbol: true })}
          </p>
          <p className="mt-0.5 text-[10px] text-text-tertiary">Available to trade or withdraw</p>
        </div>

        <div className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                hasPosition && connected ? "live-dot bg-brand" : "bg-text-tertiary"
              }`}
            />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Trading</p>
          </div>
          <p className={`mono-num mt-1 text-lg font-bold ${hasPosition ? "text-text-primary" : "text-text-tertiary"}`}>
            {formatUsdt(hasPosition ? tradingLive : 0, { withSymbol: true })}
          </p>
          {hasPosition ? (
            <p className={`mono-num mt-0.5 text-[10px] font-bold ${up ? "text-positive" : "text-negative"}`}>
              {up ? "+" : ""}
              {formatUsdt(liveDelta, { withSymbol: true })} ({formatPct(livePct, { signed: true })})
            </p>
          ) : (
            <p className="mt-0.5 text-[10px] text-text-tertiary">No open position</p>
          )}
        </div>
      </div>

      {/* Settle-value footnote — the honest, payable number */}
      {hasPosition && (
        <div className="flex items-center justify-between border-t border-border bg-surface px-4 py-2">
          <span className="text-[10px] text-text-tertiary">Confirmed settle value on close</span>
          <span className="mono-num text-[11px] font-bold text-text-secondary">
            {formatUsdt(confirmedValue, { withSymbol: true })}
          </span>
        </div>
      )}
    </div>
  );
}
