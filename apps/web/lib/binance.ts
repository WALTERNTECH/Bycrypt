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

/**
 * Timeframes offered on the chart.
 *
 * 1H is deliberately absent. At this leverage an hour of price action is
 * noise, and the timeframe chip is not only a candle size here — it also
 * sets the window the market is scanned over to produce a signal, so the
 * shortest honest read is four hours.
 *
 * Note the capital M: Binance reads "1M" as one month and "1m" as one
 * minute, so this list must never be lower-cased.
 */
export const CHART_INTERVALS = ["4h", "1d", "1w", "1M"] as const;
export type ChartInterval = (typeof CHART_INTERVALS)[number];

/**
 * 1h is still a valid request — it is the right resolution for drawing a
 * position only a few hours old, and for scanning a 4h or 1d window. It
 * just isn't offered as a chip.
 */
export type Interval = ChartInterval | "1h";

export const INTERVAL_LABEL: Record<Interval, string> = {
  "1h": "1H",
  "4h": "4H",
  "1d": "1D",
  "1w": "1W",
  "1M": "1M"
};

/**
 * What each chip means when the market is scanned for a signal: the span
 * of time to read, and the candle size to read it with.
 *
 * Picking 4H asks "how has this market performed over the last four
 * hours", so the window is four hours of hourly candles — not four-hour
 * candles stretching back fifty days. The chart still draws at the chip's
 * own interval, which is what a chart is for; the signal describes the
 * window the chip names.
 */
export const SCAN_WINDOW: Record<ChartInterval, { interval: Interval; candles: number; label: string }> = {
  "4h": { interval: "1h", candles: 4, label: "4 hours" },
  "1d": { interval: "1h", candles: 24, label: "24 hours" },
  "1w": { interval: "4h", candles: 42, label: "7 days" },
  "1M": { interval: "1d", candles: 30, label: "30 days" }
};

export function isChartInterval(value: unknown): value is ChartInterval {
  return typeof value === "string" && (CHART_INTERVALS as readonly string[]).includes(value);
}

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

/** Last traded price for a single symbol. Cheaper than the 24hr payload
 *  when a figure is all that is needed — settlement, for instance. */
export async function fetchPrice(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(`${BINANCE_REST_BASE}/api/v3/ticker/price?symbol=${symbol}`, {
      cache: "no-store"
    });
    if (!res.ok) return null;
    const json = await res.json();
    const price = Number(json?.price);
    return Number.isFinite(price) && price > 0 ? price : null;
  } catch {
    return null;
  }
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
