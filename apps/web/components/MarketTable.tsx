"use client";

import Link from "next/link";
import { useLiveTickers } from "@/hooks/useLiveTickers";
import { formatPct } from "@/lib/format";

export interface MarketSymbolRow {
  symbol: string;
  display_name: string;
}

function priceDecimals(price: number): number {
  if (price >= 100) return 2;
  if (price >= 1) return 3;
  return 6;
}

export function MarketTable({ rows }: { rows: MarketSymbolRow[] }) {
  const symbols = rows.map((r) => r.symbol);
  const { tickers, connected } = useLiveTickers(symbols);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
        <p className="text-sm font-semibold text-text-primary">Crypto Markets</p>
        <span className="flex items-center gap-1.5 text-xs text-text-secondary">
          <span
            className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-positive" : "bg-text-secondary"}`}
          />
          {connected ? "Live" : "Connecting…"}
        </span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-text-secondary">
            <th className="px-4 py-3 font-medium sm:px-5">Asset</th>
            <th className="px-4 py-3 text-right font-medium sm:px-5">Price</th>
            <th className="px-4 py-3 text-right font-medium sm:px-5">24h %</th>
            <th className="hidden px-4 py-3 text-right font-medium sm:table-cell sm:px-5">24h High</th>
            <th className="hidden px-4 py-3 text-right font-medium sm:table-cell sm:px-5">24h Low</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const t = tickers[row.symbol];
            const up = (t?.priceChangePercent ?? 0) >= 0;
            const decimals = t ? priceDecimals(t.lastPrice) : 2;
            return (
              <tr
                key={row.symbol}
                className="border-t border-border transition-colors hover:bg-surface-2"
              >
                <td className="px-4 py-3 sm:px-5">
                  <Link href={`/markets/${row.symbol}`} className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-xs font-bold text-brand">
                      {row.display_name.slice(0, 1)}
                    </span>
                    <span>
                      <span className="block font-semibold text-text-primary">{row.display_name}</span>
                      <span className="block text-xs text-text-secondary">{row.symbol}</span>
                    </span>
                  </Link>
                </td>
                <td className="mono-num px-4 py-3 text-right font-semibold text-text-primary sm:px-5">
                  {t ? t.lastPrice.toLocaleString("en-US", { maximumFractionDigits: decimals }) : "—"}
                </td>
                <td
                  className={`mono-num px-4 py-3 text-right font-semibold sm:px-5 ${
                    up ? "text-positive" : "text-negative"
                  }`}
                >
                  {t ? formatPct(t.priceChangePercent, { signed: true }) : "—"}
                </td>
                <td className="mono-num hidden px-4 py-3 text-right text-text-secondary sm:table-cell sm:px-5">
                  {t ? t.highPrice.toLocaleString("en-US", { maximumFractionDigits: decimals }) : "—"}
                </td>
                <td className="mono-num hidden px-4 py-3 text-right text-text-secondary sm:table-cell sm:px-5">
                  {t ? t.lowPrice.toLocaleString("en-US", { maximumFractionDigits: decimals }) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
