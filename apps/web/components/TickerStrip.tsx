"use client";

import { useLiveTickers } from "@/hooks/useLiveTickers";
import { formatPct } from "@/lib/format";

// Rides along the bottom of the white header, so it uses the light
// palette rather than the dark trading-body one.
export function TickerStrip({ rows }: { rows: { symbol: string; display_name: string }[] }) {
  const symbols = rows.map((r) => r.symbol);
  const { tickers } = useLiveTickers(symbols);
  const list = [...rows, ...rows]; // duplicated for a seamless marquee loop

  return (
    <div className="relative overflow-hidden border-t border-header-border bg-header-2 py-1.5">
      <div className="flex w-max animate-[marquee_38s_linear_infinite] gap-6 px-4">
        {list.map((row, i) => {
          const t = tickers[row.symbol];
          const up = (t?.priceChangePercent ?? 0) >= 0;
          return (
            <div key={`${row.symbol}-${i}`} className="flex items-center gap-1.5 whitespace-nowrap text-[11px]">
              <span className="font-bold text-header-muted">{row.symbol.replace("USDT", "")}</span>
              <span className="mono-num font-semibold text-header-text">
                {t ? t.lastPrice.toLocaleString("en-US", { maximumFractionDigits: t.lastPrice >= 100 ? 2 : 4 }) : "—"}
              </span>
              <span className={`mono-num font-bold ${up ? "text-[#0A8F5C]" : "text-[#D6293E]"}`}>
                {t ? formatPct(t.priceChangePercent, { signed: true }) : ""}
              </span>
            </div>
          );
        })}
      </div>
      {/* edge fades so the marquee dissolves instead of clipping */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-header-2 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-header-2 to-transparent" />
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
