"use client";

import { useEffect, useRef, useState } from "react";
import { BINANCE_WS_BASE, fetchTickers, type Ticker } from "@/lib/binance";

/**
 * Live-updating ticker map for a fixed set of symbols. Loads an initial
 * REST snapshot, then patches it in real time from Binance's combined
 * WebSocket stream — no backend relay needed, matches PRD 5.1's "live,
 * real-time" requirement directly from the browser.
 */
export function useLiveTickers(symbols: string[]) {
  const [tickers, setTickers] = useState<Record<string, Ticker>>({});
  const [connected, setConnected] = useState(false);
  const symbolsKey = symbols.join(",");

  useEffect(() => {
    if (symbols.length === 0) return;
    let cancelled = false;

    fetchTickers(symbols)
      .then((data) => {
        if (!cancelled) setTickers(data);
      })
      .catch(() => {
        /* initial snapshot failed — WS will still try to populate */
      });

    const streams = symbols.map((s) => `${s.toLowerCase()}@ticker`).join("/");
    const ws = new WebSocket(`${BINANCE_WS_BASE}/stream?streams=${streams}`);

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const d = payload?.data;
        if (!d?.s) return;
        setTickers((prev) => ({
          ...prev,
          [d.s]: {
            symbol: d.s,
            lastPrice: parseFloat(d.c),
            priceChangePercent: parseFloat(d.P),
            highPrice: parseFloat(d.h),
            lowPrice: parseFloat(d.l),
            volume: parseFloat(d.v)
          }
        }));
      } catch {
        // ignore malformed frames
      }
    };

    return () => {
      cancelled = true;
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey]);

  return { tickers, connected };
}
