"use client";

import { useLiveTickers } from "@/hooks/useLiveTickers";
import { formatPct } from "@/lib/format";

export function TickerStrip({ rows }: { rows: { symbol: string; display_name: string }[] }) {
  const symbols = rows.map((r) => r.symbol);
  const { tickers } = useLiveTickers(symbols);
  const list = [...rows, ...rows]; // duplicate for seamless marquee

  return (
    <div className="relative overflow-hidden border-y border-border/60 bg-panel py-2.5">
      <div className="animate-[marquee_35s_linear_infinite] flex w-max gap-8 px-4">
        {list.map((row, i) => {
          const t = tickers[row.symbol];
          const up = (t?.priceChangePercent ?? 0) >= 0;
          return (
            <div key={`${row.symbol}-${i}`} className="flex items-center gap-2 whitespace-nowrap text-sm">
              <span className="font-semibold text-text-primary">{row.display_name}</span>
              <span className="mono-num text-text-secondary">
                {t ? t.lastPrice.toLocaleString("en-US", { maximumFractionDigits: t.lastPrice >= 100 ? 2 : 4 }) : "—"}
              </span>
              <span className={`mono-num font-semibold ${up ? "text-positive" : "text-negative"}`}>
                {t ? formatPct(t.priceChangePercent, { signed: true }) : ""}
              </span>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
