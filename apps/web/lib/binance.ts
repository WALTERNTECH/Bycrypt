// Client + server safe helpers for Binance's public market data API.
// No API key required for public ticker/kline endpoints.

export const BINANCE_REST_BASE = "https://api.binance.com";
export const BINANCE_WS_BASE = "wss://stream.binance.com:9443";

export interface Ticker {
  symbol: string;
  lastPrice: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
}

export interface Candle {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
}

export const SUPPORTED_INTERVALS = ["1h", "4h", "1d", "1w"] as const;
export type Interval = (typeof SUPPORTED_INTERVALS)[number];

export async function fetchTickers(symbols: string[]): Promise<Record<string, Ticker>> {
  if (symbols.length === 0) return {};
  const query = encodeURIComponent(JSON.stringify(symbols));
  const res = await fetch(`${BINANCE_REST_BASE}/api/v3/ticker/24hr?symbols=${query}`, {
    next: { revalidate: 5 }
  });
  if (!res.ok) throw new Error(`Binance ticker fetch failed: ${res.status}`);
  const raw = (await res.json()) as any[];
  const out: Record<string, Ticker> = {};
  for (const t of raw) {
    out[t.symbol] = {
      symbol: t.symbol,
      lastPrice: parseFloat(t.lastPrice),
      priceChangePercent: parseFloat(t.priceChangePercent),
      highPrice: parseFloat(t.highPrice),
      lowPrice: parseFloat(t.lowPrice),
      volume: parseFloat(t.volume)
    };
  }
  return out;
}

export async function fetchCandles(symbol: string, interval: Interval, limit = 300): Promise<Candle[]> {
  const res = await fetch(
    `${BINANCE_REST_BASE}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Binance klines fetch failed: ${res.status}`);
  const raw = (await res.json()) as any[];
  return raw.map((k) => ({
    time: Math.floor(k[0] / 1000),
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4])
  }));
}
