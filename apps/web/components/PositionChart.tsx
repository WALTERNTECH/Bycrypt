"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, type IChartApi, type ISeriesApi } from "lightweight-charts";
import { useLiveTickers } from "@/hooks/useLiveTickers";
import { formatUsdt } from "@/lib/format";
import { leveragedPct, leveragedProfit } from "@/lib/leverage";
import { fetchCandles, type Interval } from "@/lib/binance";

/**
 * The open position, drawn.
 *
 * This replaces the old "buy TON" signal card. That card recommended a
 * coin; this one reports on the money actually at stake — what it was
 * bought at, what the market has done since, and what the position is
 * worth right now.
 *
 * Everything here is real. The line is Binance price history for the
 * coin held, the dashed marker is the price recorded when the position
 * opened, and the figure underneath is computed from the two. It moves
 * down as readily as up, because that is what the market does.
 */

interface Props {
  symbol: string;
  displayName: string;
  principal: number;
  /** Price recorded at entry. Null for positions opened before it was tracked. */
  entryPrice: number | null;
  /** ISO timestamp the position opened. */
  startedAt: string;
}

function pickInterval(startedAt: string): Interval {
  const hours = (Date.now() - new Date(startedAt).getTime()) / 3_600_000;
  if (hours <= 24) return "1h";
  if (hours <= 24 * 10) return "4h";
  if (hours <= 24 * 90) return "1d";
  return "1w";
}

export function PositionChart({ symbol, displayName, principal, entryPrice, startedAt }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const [resolvedEntry, setResolvedEntry] = useState<number | null>(entryPrice);
  const { tickers } = useLiveTickers([symbol]);

  const ticker = tickers[symbol];
  const livePrice = ticker?.lastPrice ?? null;

  // Move against entry, which is the only honest basis for "how is my
  // position doing" — the 24h change would describe a window the user
  // may not even have been in.
  const rawPct =
    resolvedEntry && livePrice ? ((livePrice - resolvedEntry) / resolvedEntry) * 100 : null;

  const profit = rawPct === null ? null : leveragedProfit(principal, rawPct);
  const displayPct = rawPct === null ? null : leveragedPct(principal, rawPct);
  const up = (displayPct ?? 0) >= 0;

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: "#FFFFFF" }, textColor: "#8A8D94" },
      grid: { vertLines: { visible: false }, horzLines: { color: "#F2F3F5" } },
      width: containerRef.current.clientWidth,
      height: 190,
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true },
      crosshair: { mode: 0 },
      // Same reasoning as the main chart: on a phone this sits mid-page,
      // so vertical gestures belong to the page, not the chart.
      handleScroll: { vertTouchDrag: false, mouseWheel: false },
      handleScale: false
    });

    const series = chart.addAreaSeries({
      lineColor: "#F7A600",
      topColor: "rgba(247,166,0,0.18)",
      bottomColor: "rgba(247,166,0,0.01)",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const onResize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const interval = pickInterval(startedAt);
      try {
        const candles = await fetchCandles(symbol, interval, 300);
        if (cancelled || !seriesRef.current) return;

        const startSec = Math.floor(new Date(startedAt).getTime() / 1000);
        // Only the life of the position. Showing history from before it
        // opened would make the line describe someone else's trade.
        const since = candles.filter((c) => c.time >= startSec);
        const points = (since.length > 1 ? since : candles.slice(-40)).map((c) => ({
          time: c.time as never,
          value: c.close
        }));
        seriesRef.current.setData(points);
        chartRef.current?.timeScale().fitContent();

        // Positions opened before entry_price existed fall back to the
        // first close after they started — the closest honest proxy.
        if (resolvedEntry === null && since.length > 0) {
          setResolvedEntry(since[0].close);
        }
      } catch {
        // Leave the chart empty rather than drawing invented data.
      }
    }

    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [symbol, startedAt, resolvedEntry]);

  // Mark entry on the price scale so the line is read against it.
  useEffect(() => {
    const series = seriesRef.current;
    if (!series || resolvedEntry === null) return;
    const line = series.createPriceLine({
      price: resolvedEntry,
      color: "#8A8D94",
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: "entry"
    });
    return () => {
      try {
        series.removePriceLine(line);
      } catch {
        /* chart already torn down */
      }
    };
  }, [resolvedEntry]);

  return (
    <section className="mt-3 overflow-hidden rounded-xl border border-border bg-surface">
      <header className="flex items-center justify-between px-4 pt-3.5">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-text-primary">
            {displayName} <span className="font-medium text-text-tertiary">position</span>
          </p>
          <p className="mt-0.5 text-[11px] text-text-tertiary">
            {resolvedEntry !== null ? (
              <>
                Entry <span className="mono-num">{resolvedEntry.toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
              </>
            ) : (
              "Entry price unavailable"
            )}
            {livePrice !== null && (
              <>
                {" · "}Now{" "}
                <span className="mono-num">{livePrice.toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
              </>
            )}
          </p>
        </div>
        {displayPct !== null && (
          <span
            className={`mono-num rounded px-1.5 py-0.5 text-[12px] font-semibold ${
              up ? "bg-positive-dim text-positive" : "bg-negative-dim text-negative"
            }`}
          >
            {up ? "+" : ""}
            {displayPct.toFixed(2)}%
          </span>
        )}
      </header>

      <div ref={containerRef} className="mt-2 w-full" />

      <div className="grid grid-cols-3 border-t border-border">
        <Cell label="Staked" value={formatUsdt(principal, { withSymbol: true })} />
        <Cell
          label={up ? "Gain" : "Loss"}
          value={profit === null ? "—" : formatUsdt(profit, { withSymbol: true })}
          tone={profit === null ? undefined : up ? "up" : "down"}
        />
        <Cell
          label="Value"
          value={profit === null ? "—" : formatUsdt(principal + profit, { withSymbol: true })}
          strong
        />
      </div>
    </section>
  );
}

function Cell({
  label,
  value,
  tone,
  strong
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
  strong?: boolean;
}) {
  return (
    <div className="border-r border-border px-3 py-2.5 last:border-r-0">
      <p className="text-[10px] uppercase tracking-wide text-text-tertiary">{label}</p>
      <p
        className={`mono-num mt-0.5 text-[13px] ${strong ? "font-bold" : "font-semibold"} ${
          tone === "up" ? "text-positive" : tone === "down" ? "text-negative" : "text-text-primary"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
