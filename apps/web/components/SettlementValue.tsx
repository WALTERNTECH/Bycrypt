"use client";

import { useLiveTickers } from "@/hooks/useLiveTickers";
import { leveragedProfit } from "@/lib/leverage";
import { formatUsdt, formatPct } from "@/lib/format";

/**
 * What closing a position actually pays, computed the same way the
 * server computes it at settlement: the stake, plus whichever is larger
 * of the live market profit and the admin-set floor.
 *
 * Every "settles at" figure in the app goes through this, so a user is
 * never shown one number and paid another — the bug this whole change
 * exists to fix.
 */
export function settlementOf(principal: number, accrued: number, rawPct: number) {
  const profit = Math.max(accrued, leveragedProfit(principal, rawPct), 0);
  return {
    profit,
    total: principal + profit,
    pct: principal > 0 ? (profit / principal) * 100 : 0
  };
}

export function SettlementValue({
  symbol,
  principal,
  accrued
}: {
  symbol: string | null;
  principal: number;
  accrued: number;
}) {
  const { tickers } = useLiveTickers(symbol ? [symbol] : []);
  const rawPct = symbol ? (tickers[symbol]?.priceChangePercent ?? 0) : 0;
  const { total, pct, profit } = settlementOf(principal, accrued, rawPct);

  return (
    <>
      <p className="mono-num mt-1 text-sm font-bold text-text-primary">
        {formatUsdt(total, { withSymbol: true })}
      </p>
      <p className={`mono-num text-[10px] font-bold ${profit > 0 ? "text-positive" : "text-text-tertiary"}`}>
        {formatPct(pct, { signed: true })}
      </p>
    </>
  );
}
