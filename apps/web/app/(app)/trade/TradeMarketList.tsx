"use client";

import Link from "next/link";
import { useLiveTickers } from "@/hooks/useLiveTickers";
import { formatUsdt, formatPct } from "@/lib/format";

export function TradeMarketList({
  rows,
  walletBalance
}: {
  rows: { symbol: string; display_name: string }[];
  walletBalance: number;
}) {
  const symbols = rows.map((r) => r.symbol);
  const { tickers } = useLiveTickers(symbols);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface shadow-card p-4">
        <p className="text-xs font-medium text-text-secondary">Available to trade</p>
        <p className="mono-num mt-1 text-2xl font-extrabold text-text-primary">
          {formatUsdt(walletBalance, { withSymbol: true })}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
        {rows.map((row) => {
          const t = tickers[row.symbol];
          const up = (t?.priceChangePercent ?? 0) >= 0;
          const decimals = t && t.lastPrice >= 100 ? 2 : 4;
          return (
            <Link
              key={row.symbol}
              href={`/trade/${row.symbol}`}
              className="flex items-center justify-between border-t border-border px-4 py-3 transition-colors first:border-t-0 hover:bg-surface-2"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-xs font-bold text-brand">
                  {row.display_name.slice(0, 1)}
                </span>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{row.symbol.replace("USDT", "")}</p>
                  <p className="text-[10px] text-text-secondary">{row.display_name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="mono-num text-sm font-semibold text-text-primary">
                  {t ? t.lastPrice.toLocaleString("en-US", { maximumFractionDigits: decimals }) : "—"}
                </p>
                <p className={`mono-num text-xs font-semibold ${up ? "text-positive" : "text-negative"}`}>
                  {t ? formatPct(t.priceChangePercent, { signed: true }) : ""}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
