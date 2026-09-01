"use client";

import Link from "next/link";
import { useLiveTickers } from "@/hooks/useLiveTickers";
import { formatUsdt, formatPct } from "@/lib/format";
import { leveragedValue, leveragedPct, leveragedProfit } from "@/lib/leverage";
import { ClosePositionButton } from "./ClosePositionButton";

// The home-screen view of the single open position: what's in it, how
// it's moving, and — always — a way out of it.
export function OpenPositionCard({
  id,
  symbol,
  principal,
  accrued
}: {
  id: string;
  symbol: string | null;
  principal: number;
  accrued: number;
}) {
  const { tickers, connected } = useLiveTickers(symbol ? [symbol] : []);
  const t = symbol ? tickers[symbol] : undefined;
  const rawPct = t?.priceChangePercent ?? 0;
  const liveValue = leveragedValue(principal, rawPct);
  // Shown percentage is the position's move, not the coin's, so it
  // agrees with the value above it.
  const livePct = leveragedPct(principal, rawPct);
  const up = rawPct >= 0;
  const coin = symbol?.replace("USDT", "") ?? "—";

  // What closing actually pays: the larger of the market profit and the
  // admin-set floor, on top of the stake. Profit never goes below zero,
  // so a losing position returns the stake rather than eating the
  // wallet — which is why this can read higher than the live value.
  const settleProfit = Math.max(accrued, leveragedProfit(principal, rawPct), 0);
  const settleValue = principal + settleProfit;
  const settlePct = principal > 0 ? (settleProfit / principal) * 100 : 0;

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border-strong bg-surface-2 text-xs font-bold text-text-primary">
            {coin.slice(0, 4)}
          </span>
          <div>
            <p className="text-sm font-bold text-text-primary">{coin} position</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? "live-dot bg-positive" : "bg-text-tertiary"}`} />
              <span className="text-[10px] font-medium text-text-tertiary">Open · trading balance</span>
            </div>
          </div>
        </div>
        <Link
          href={symbol ? `/trade/${symbol}` : "/trade"}
          className="text-xs font-bold text-brand transition-colors hover:text-brand-hover"
        >
          Chart →
        </Link>
      </div>

      <div className="grid grid-cols-3 divide-x divide-border">
        <div className="px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Staked</p>
          <p className="mono-num mt-1 text-sm font-bold text-text-primary">{formatUsdt(principal, { withSymbol: true })}</p>
        </div>
        <div className="px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Live value</p>
          <p className={`mono-num mt-1 text-sm font-bold ${up ? "text-positive" : "text-negative"}`}>
            {formatUsdt(liveValue, { withSymbol: true })}
          </p>
          <p className={`mono-num text-[10px] font-bold ${up ? "text-positive" : "text-negative"}`}>
            {formatPct(livePct, { signed: true })}
          </p>
        </div>
        <div className="px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Settles at</p>
          <p className="mono-num mt-1 text-sm font-bold text-text-primary">{formatUsdt(settleValue, { withSymbol: true })}</p>
          <p className={`mono-num text-[10px] font-bold ${accrued > 0 ? "text-positive" : "text-text-tertiary"}`}>
            {formatPct(settlePct, { signed: true })}
          </p>
        </div>
      </div>

      <div className="border-t border-border p-3">
        <ClosePositionButton investmentId={id} symbol={symbol} principal={principal} accrued={accrued} size="md" />
        <p className="mt-2 text-center text-[10px] leading-relaxed text-text-tertiary">
          Closing moves your funds back to your Krypton wallet. Withdrawals are made from the wallet.
        </p>
      </div>
    </div>
  );
}
