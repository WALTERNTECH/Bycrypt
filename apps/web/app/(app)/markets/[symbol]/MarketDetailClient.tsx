"use client";

import { useState } from "react";
import { CandleChart } from "@/components/CandleChart";
import { useLiveTickers } from "@/hooks/useLiveTickers";
import { formatPct } from "@/lib/format";
import { CHART_INTERVALS, INTERVAL_LABEL, type ChartInterval } from "@/lib/binance";

export function MarketDetailClient({ symbol, displayName }: { symbol: string; displayName: string }) {
  const [interval, setInterval] = useState<ChartInterval>("1d");
  const { tickers } = useLiveTickers([symbol]);
  const t = tickers[symbol];
  const up = (t?.priceChangePercent ?? 0) >= 0;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-text-secondary">{displayName}</p>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="mono-num text-3xl font-extrabold text-text-primary">
              {t ? `$${t.lastPrice.toLocaleString("en-US", { maximumFractionDigits: t.lastPrice >= 100 ? 2 : 6 })}` : "—"}
            </span>
            <span className={`mono-num text-sm font-semibold ${up ? "text-positive" : "text-negative"}`}>
              {t ? formatPct(t.priceChangePercent, { signed: true }) : ""}
            </span>
          </div>
        </div>

        <div className="flex gap-1 rounded-lg bg-surface-2 p-1">
          {CHART_INTERVALS.map((iv) => (
            <button
              key={iv}
              onClick={() => setInterval(iv)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                interval === iv ? "bg-base text-text-primary shadow-card" : "text-text-tertiary hover:text-text-primary"
              }`}
            >
              {INTERVAL_LABEL[iv]}
            </button>
          ))}
        </div>
      </div>

      {t && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-surface-2 p-3">
            <p className="text-xs text-text-secondary">24h High</p>
            <p className="mono-num mt-1 text-sm font-semibold text-text-primary">
              {t.highPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="rounded-lg bg-surface-2 p-3">
            <p className="text-xs text-text-secondary">24h Low</p>
            <p className="mono-num mt-1 text-sm font-semibold text-text-primary">
              {t.lowPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="col-span-2 rounded-lg bg-surface-2 p-3 sm:col-span-2">
            <p className="text-xs text-text-secondary">24h Volume</p>
            <p className="mono-num mt-1 text-sm font-semibold text-text-primary">
              {t.volume.toLocaleString("en-US", { maximumFractionDigits: 2 })} {symbol.replace("USDT", "")}
            </p>
          </div>
        </div>
      )}

      <div className="mt-5">
        <CandleChart symbol={symbol} interval={interval} />
      </div>
    </div>
  );
}
