"use client";

import { useLiveTickers } from "@/hooks/useLiveTickers";
import { formatPct } from "@/lib/format";

export function TickerStrip({ rows }: { rows: { symbol: string; display_name: string }[] }) {
  const symbols = rows.map((r) => r.symbol);
  const { tickers } = useLiveTickers(symbols);
  const list = [...rows, ...rows]; // duplicated for a seamless marquee loop

  return (
    <div className="relative overflow-hidden border-t border-border bg-surface py-2">
      <div className="flex w-max animate-[marquee_38s_linear_infinite] gap-7 px-4">
        {list.map((row, i) => {
          const t = tickers[row.symbol];
          const up = (t?.priceChangePercent ?? 0) >= 0;
          return (
            <div key={`${row.symbol}-${i}`} className="flex items-center gap-1.5 whitespace-nowrap text-[11px]">
              <span className="font-bold text-text-secondary">{row.symbol.replace("USDT", "")}</span>
              <span className="mono-num font-medium text-text-primary">
                {t ? t.lastPrice.toLocaleString("en-US", { maximumFractionDigits: t.lastPrice >= 100 ? 2 : 4 }) : "—"}
              </span>
              <span className={`mono-num font-bold ${up ? "text-positive" : "text-negative"}`}>
                {t ? formatPct(t.priceChangePercent, { signed: true }) : ""}
              </span>
            </div>
          );
        })}
      </div>
      {/* edge fades so the marquee dissolves instead of clipping */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-surface to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-surface to-transparent" />
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
