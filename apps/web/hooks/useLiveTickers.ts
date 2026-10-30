"use client";

import { useEffect, useRef, useState } from "react";
import { BINANCE_WS_BASE, fetchTickers, type Ticker } from "@/lib/market";

/**
 * Live-updating ticker map for a fixed set of symbols.
 *
 * A REST snapshot lands first — that one goes through the multi-venue
 * lookup, so it arrives wherever the app is opened — and the Binance
 * stream then patches it in real time.
 *
 * The stream is not assumed to connect. Binance is unreachable from some
 * regions, and when it was the only source the screen simply froze on
 * whatever it had: prices that looked current and were not. If the socket
 * is not open, a REST poll takes over and keeps the figures honest, and
 * it stands down again the moment the socket comes up.
 */
export function useLiveTickers(symbols: string[]) {
  const [tickers, setTickers] = useState<Record<string, Ticker>>({});
  const [connected, setConnected] = useState(false);
  const symbolsKey = symbols.join(",");
  const connectedRef = useRef(false);

  useEffect(() => {
    if (symbols.length === 0) return;
    let cancelled = false;
    connectedRef.current = false;

    const snapshot = () =>
      fetchTickers(symbols)
        .then((data) => {
          if (!cancelled && Object.keys(data).length > 0) {
            setTickers((prev) => ({ ...prev, ...data }));
          }
        })
        .catch(() => {
          /* every venue down — leave the last known figures in place */
        });

    snapshot();

    // Only runs while the socket is down, so a working stream costs
    // nothing extra.
    const poll = setInterval(() => {
      if (!connectedRef.current) snapshot();
    }, 10_000);

    const streams = symbols.map((s) => `${s.toLowerCase()}@ticker`).join("/");
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(`${BINANCE_WS_BASE}/stream?streams=${streams}`);
    } catch {
      // Blocked outright; the poll above is already covering it.
    }

    if (ws) {
      ws.onopen = () => {
        connectedRef.current = true;
        setConnected(true);
      };
      ws.onclose = () => {
        connectedRef.current = false;
        setConnected(false);
      };
      ws.onerror = () => {
        connectedRef.current = false;
        setConnected(false);
      };
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
    }

    return () => {
      cancelled = true;
      clearInterval(poll);
      ws?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey]);

  return { tickers, connected };
}
