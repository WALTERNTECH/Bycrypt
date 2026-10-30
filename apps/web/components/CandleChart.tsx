"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, type IChartApi, type ISeriesApi } from "lightweight-charts";
import { fetchCandles, BINANCE_WS_BASE, type Interval } from "@/lib/market";

export function CandleChart({ symbol, interval }: { symbol: string; interval: Interval }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: "#FFFFFF" }, textColor: "#8A8D94" },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "#F2F3F5" }
      },
      width: containerRef.current.clientWidth,
      height: 300,
      timeScale: { timeVisible: true, borderVisible: false },
      rightPriceScale: { borderVisible: false },
      crosshair: { mode: 0 },
      // The chart sits mid-page on a phone, with the order controls below
      // it. Left to its defaults it swallows vertical drags and the wheel
      // to pan itself, so the page cannot be scrolled past it and the Buy
      // and Sell buttons become unreachable. Vertical gestures are handed
      // back to the page; horizontal drag and pinch still work the chart.
      handleScroll: { vertTouchDrag: false, mouseWheel: false },
      handleScale: { axisPressedMouseMove: { time: true, price: false } }
    });

    const series = chart.addCandlestickSeries({
      upColor: "#20B26C",
      downColor: "#EF454A",
      borderVisible: false,
      wickUpColor: "#20B26C",
      wickDownColor: "#EF454A"
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchCandles(symbol, interval, 300).then((candles) => {
      if (cancelled || !seriesRef.current) return;
      seriesRef.current.setData(
        candles.map((c) => ({ time: c.time as any, open: c.open, high: c.high, low: c.low, close: c.close }))
      );
      chartRef.current?.timeScale().fitContent();
      setLoading(false);
    });

    const ws = new WebSocket(`${BINANCE_WS_BASE}/ws/${symbol.toLowerCase()}@kline_${interval}`);
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const k = payload?.k;
        if (!k || !seriesRef.current) return;
        seriesRef.current.update({
          time: Math.floor(k.t / 1000) as any,
          open: parseFloat(k.o),
          high: parseFloat(k.h),
          low: parseFloat(k.l),
          close: parseFloat(k.c)
        });
      } catch {
        // ignore malformed frames
      }
    };

    return () => {
      cancelled = true;
      ws.close();
    };
  }, [symbol, interval]);

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-text-secondary">
          Loading chart…
        </div>
      )}
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
