"use client";

import Link from "next/link";
import { useLiveTickers } from "@/hooks/useLiveTickers";
import { formatPct } from "@/lib/format";

export function CoinGrid({ rows }: { rows: { symbol: string; display_name: string }[] }) {
  const symbols = rows.map((r) => r.symbol);
  const { tickers } = useLiveTickers(symbols);

  return (
    <div className="grid grid-cols-2 gap-3">
      {rows.map((row) => {
        const t = tickers[row.symbol];
        const up = (t?.priceChangePercent ?? 0) >= 0;
        const decimals = t && t.lastPrice >= 100 ? 2 : 4;
        return (
          <Link
            key={row.symbol}
            href={`/markets/${row.symbol}`}
            className="rounded-xl border border-border/60 bg-panel p-3.5 transition-colors hover:border-border"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-text-primary">{row.symbol.replace("USDT", "")}</span>
              <span className="text-[10px] text-text-secondary">/USDT</span>
            </div>
            <p className="mono-num mt-1.5 text-base font-bold text-text-primary">
              {t ? t.lastPrice.toLocaleString("en-US", { maximumFractionDigits: decimals }) : "—"}
            </p>
            <span className={`mono-num text-xs font-semibold ${up ? "text-positive" : "text-negative"}`}>
              {t ? formatPct(t.priceChangePercent, { signed: true }) : ""}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
