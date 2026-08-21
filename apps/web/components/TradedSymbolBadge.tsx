"use client";

import { useLiveTickers } from "@/hooks/useLiveTickers";
import { formatPct } from "@/lib/format";

export function TradedSymbolBadge({ symbol }: { symbol: string }) {
  const { tickers } = useLiveTickers([symbol]);
  const t = tickers[symbol];
  const up = (t?.priceChangePercent ?? 0) >= 0;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-panel-2 px-2 py-1 text-xs">
      <span className="font-semibold text-text-primary">{symbol.replace("USDT", "")}</span>
      {t && (
        <span className={`mono-num font-semibold ${up ? "text-positive" : "text-negative"}`}>
          {formatPct(t.priceChangePercent, { signed: true })}
        </span>
      )}
    </span>
  );
}
