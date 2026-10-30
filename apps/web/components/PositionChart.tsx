"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createChart, ColorType, type IChartApi, type ISeriesApi } from "lightweight-charts";
import { usePositionState } from "@/hooks/usePositionState";
import { formatUsdt, formatPct } from "@/lib/format";
import { coinMoveForTarget } from "@/lib/leverage";
import { fetchCandles, type Interval } from "@/lib/market";
import type { OpenPositionRow } from "@/lib/position";

/**
 * The open position, drawn.
 *
 * Everything here is real. The line is Binance price history for the coin
 * held, the dashed marker is the price recorded when the position opened,
 * and the figures underneath are computed from the two. It moves down as
 * readily as up, because that is what the market does.
 *
 * Three things changed in this pass:
 *
 *   The Gain and Value cells no longer print a dash. They were reading a
 *   price that had not arrived yet; the figures now come from the same
 *   live state the rest of the app uses, which carries a price from its
 *   first render.
 *
 *   A SELL position is read in its own direction — a falling line is a
 *   winning line, and the colour follows the P&L rather than the price.
 *
 *   The auto-close target is drawn on the price scale, so the distance
 *   left to run is something you can see rather than calculate.
 */

function pickInterval(startedAt: string): Interval {
  const hours = (Date.now() - new Date(startedAt).getTime()) / 3_600_000;
  // 1h is not offered as a chip, but a position two hours old needs it —
  // four-hour candles would draw it as a single point.
  if (hours <= 48) return "1h";
  if (hours <= 24 * 20) return "4h";
  if (hours <= 24 * 120) return "1d";
  return "1w";
}

export function PositionChart({ row, displayName }: { row: OpenPositionRow; displayName: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const [candleEntry, setCandleEntry] = useState<number | null>(null);

  // Positions opened before entry prices were recorded fall back to the
  // first close after they started — the closest honest proxy there is.
  const effectiveRow = useMemo<OpenPositionRow>(
    () => (row.entryPrice !== null ? row : { ...row, entryPrice: candleEntry }),
    [row, candleEntry]
  );

  const { state, ticker } = usePositionState(effectiveRow);
  const entry = effectiveRow.entryPrice;
  const livePrice = ticker?.lastPrice ?? null;
  const up = state.pnl >= 0;
  const isSell = row.side === "SELL";

  // The price that would put this position at its target gain. Drawn on
  // the chart so "how far to go" is visible on the axis.
  const targetPrice =
    entry && row.targetGainPct
      ? entry * (1 + ((isSell ? -1 : 1) * coinMoveForTarget(row.targetGainPct, state.leverage)) / 100)
      : null;

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: "#FFFFFF" }, textColor: "#8A8D94" },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      width: containerRef.current.clientWidth,
      height: 186,
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true },
      crosshair: { mode: 0 },
      // This sits mid-page on a phone, so vertical gestures belong to the
      // page rather than to the chart.
      handleScroll: { vertTouchDrag: false, mouseWheel: false },
      handleScale: false
    });

    const series = chart.addAreaSeries({
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

  // The line takes the colour of the position's result, not the price's
  // direction — on a SELL those are opposites.
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    series.applyOptions(
      up
        ? { lineColor: "#20B26C", topColor: "rgba(32,178,108,0.16)", bottomColor: "rgba(32,178,108,0.01)" }
        : { lineColor: "#EF454A", topColor: "rgba(239,69,74,0.16)", bottomColor: "rgba(239,69,74,0.01)" }
    );
  }, [up]);

  useEffect(() => {
    if (!row.symbol) return;
    let cancelled = false;
    const symbol = row.symbol;

    async function load() {
      const interval = pickInterval(row.startedAt);
      try {
        const candles = await fetchCandles(symbol, interval, 300);
        if (cancelled || !seriesRef.current) return;

        const startSec = Math.floor(new Date(row.startedAt).getTime() / 1000);
        // Only the life of the position. History from before it opened
        // would make the line describe a trade nobody took.
        const since = candles.filter((c) => c.time >= startSec);
        const window = since.length > 1 ? since : candles.slice(-40);
        seriesRef.current.setData(window.map((c) => ({ time: c.time as never, value: c.close })));
        chartRef.current?.timeScale().fitContent();

        if (row.entryPrice === null && since.length > 0) setCandleEntry(since[0].close);
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
  }, [row.symbol, row.startedAt, row.entryPrice]);

  // Entry and target, marked on the price scale.
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    const lines: ReturnType<typeof series.createPriceLine>[] = [];
    if (entry !== null) {
      lines.push(
        series.createPriceLine({
          price: entry,
          color: "#8A8D94",
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: "entry"
        })
      );
    }
    if (targetPrice !== null) {
      lines.push(
        series.createPriceLine({
          price: targetPrice,
          color: "#F7A600",
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: "target"
        })
      );
    }
    return () => {
      for (const line of lines) {
        try {
          series.removePriceLine(line);
        } catch {
          /* chart already torn down */
        }
      }
    };
  }, [entry, targetPrice]);

  const dp = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: n >= 100 ? 2 : 6 });
  const toGo = row.targetGainPct === null ? null : Math.max(0, row.targetGainPct - state.pnlPct);

  return (
    <section className="mt-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[14px] font-bold text-text-primary">{displayName}</p>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                isSell ? "bg-negative-dim text-negative" : "bg-positive-dim text-positive"
              }`}
            >
              {row.side}
            </span>
            {row.timeframe && (
              <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold text-text-secondary">
                {row.timeframe}
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-text-tertiary">
            {entry !== null ? (
              <>
                Entry <span className="mono-num text-text-secondary">{dp(entry)}</span>
              </>
            ) : (
              "Opening price"
            )}
            {livePrice !== null && (
              <>
                {" · "}Now <span className="mono-num text-text-secondary">{dp(livePrice)}</span>
              </>
            )}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className={`mono-num text-[20px] font-bold leading-none ${up ? "text-positive" : "text-negative"}`}>
            {up ? "+" : "-"}
            {formatUsdt(Math.abs(state.pnl))}
          </p>
          <p
            className={`mono-num mt-1 inline-block rounded px-1.5 py-0.5 text-[11px] font-bold ${
              up ? "bg-positive-dim text-positive" : "bg-negative-dim text-negative"
            }`}
          >
            {formatPct(state.pnlPct, { signed: true })}
          </p>
        </div>
      </header>

      <div ref={containerRef} className="mt-2 w-full" />

      <div className="grid grid-cols-3 gap-2">
        <Cell label="Invested" value={formatUsdt(row.principal, { withSymbol: true })} />
        <Cell
          label={up ? "Gain" : "Loss"}
          value={formatUsdt(Math.abs(state.pnl), { withSymbol: true })}
          tone={up ? "up" : "down"}
        />
        <Cell label="Value" value={formatUsdt(state.value, { withSymbol: true })} strong />
      </div>

      {row.targetGainPct !== null && (
        <p className="mt-2.5 text-[11px] leading-relaxed text-text-tertiary">
          Closes itself at <span className="font-bold text-text-secondary">+{row.targetGainPct}%</span>
          {targetPrice !== null && (
            <>
              {" "}
              — {isSell ? "a fall to" : "a rise to"}{" "}
              <span className="mono-num font-bold text-text-secondary">{dp(targetPrice)}</span>
            </>
          )}
          . {state.targetReached ? "Target reached — settling now." : `${toGo?.toFixed(1)}% to go.`}
        </p>
      )}
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
    <div className="rounded-lg bg-surface-2 px-3 py-2.5">
      <p className="text-[10px] font-medium text-text-tertiary">{label}</p>
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
