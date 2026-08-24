"use client";

import Link from "next/link";
import { useLiveTickers } from "@/hooks/useLiveTickers";
import { formatPct } from "@/lib/format";

export function CoinGrid({ rows }: { rows: { symbol: string; display_name: string }[] }) {
  const symbols = rows.map((r) => r.symbol);
  const { tickers } = useLiveTickers(symbols);

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {rows.map((row) => {
        const t = tickers[row.symbol];
        const up = (t?.priceChangePercent ?? 0) >= 0;
        const decimals = t && t.lastPrice >= 100 ? 2 : 4;
        const coin = row.symbol.replace("USDT", "");
        return (
          <Link
            key={row.symbol}
            href={`/markets/${row.symbol}`}
            className="group rounded-xl border border-border bg-surface p-3 shadow-card transition-all duration-150 hover:border-border-strong hover:bg-surface-2 active:translate-y-px"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md border border-border-strong bg-surface-2 text-[9px] font-bold text-text-secondary">
                {coin.slice(0, 3)}
              </span>
              <span className="text-xs font-bold text-text-primary">{coin}</span>
              <span className="text-[9px] font-medium text-text-tertiary">/USDT</span>
            </div>
            <p className="mono-num mt-2 text-base font-bold text-text-primary">
              {t ? t.lastPrice.toLocaleString("en-US", { maximumFractionDigits: decimals }) : "—"}
            </p>
            <span
              className={`mono-num inline-flex rounded px-1 py-0.5 text-[11px] font-bold ${
                up ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"
              }`}
            >
              {t ? formatPct(t.priceChangePercent, { signed: true }) : "—"}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
