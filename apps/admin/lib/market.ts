// Public market data, from whichever exchange will answer.
//
// This used to call Binance directly and nothing else, which worked
// perfectly in a browser and failed silently on every server render.
// Binance answers 451 to US IP addresses, and these functions run in
// Vercel's iad1 region — so every server-side price lookup returned null
// while the same call from the user's phone returned a price.
//
// Nothing threw. The failures were all absorbed by code that treated a
// missing price as "unknown" and carried on with a default:
//
//   the market scan returned nothing, so every position opened BUY
//   regardless of the signal shown to the user;
//   entry_price was never recorded, so P&L fell back to the coin's 24h
//   move and a new position opened at an instant loss in a red market;
//   settlement could not value the position, so it credited back the
//   exactly — closing a position moved the wallet by nothing at all;
//   and the BTC rate was unavailable, so starting a deposit 503'd.
//
// One unreachable host, four broken features, no error anywhere. So the
// fix is not a better Binance call — it is to stop depending on any
// single venue. Each function tries the sources in turn and returns the
// first real answer. Bybit leads because it is reachable from every
// region this app runs in, and because it is the exchange this product
// is modelled on.

export const BINANCE_REST_BASE = "https://api.binance.com";
export const BINANCE_WS_BASE = "wss://stream.binance.com:9443";
export const BYBIT_WS_BASE = "wss://stream.bybit.com/v5/public/spot";

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
 * Note the capital M: it reads as one month, where "1m" would be one
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

/* ------------------------------------------------------------------ */
/* Per-venue adapters                                                  */
/* ------------------------------------------------------------------ */

const BYBIT_INTERVAL: Record<Interval, string> = {
  "1h": "60",
  "4h": "240",
  "1d": "D",
  "1w": "W",
  "1M": "M"
};

const OKX_INTERVAL: Record<Interval, string> = {
  "1h": "1H",
  "4h": "4H",
  "1d": "1D",
  "1w": "1W",
  "1M": "1M"
};

/** BTCUSDT -> BTC-USDT */
function okxInst(symbol: string): string {
  return symbol.replace(/USDT$/, "-USDT").replace(/USDC$/, "-USDC");
}

/** BTCUSDT -> BTC-USD. Coinbase quotes most pairs against USD rather
 *  than USDT; the two differ by a fraction of a percent, which is well
 *  inside the tolerance of a source that only runs when three other
 *  venues are unreachable. */
function coinbaseProduct(symbol: string): string {
  return symbol.replace(/USDT$/, "-USD").replace(/USDC$/, "-USD");
}

/** Coinbase serves a fixed set of granularities, so 4h, 1w and 1M are
 *  built by bucketing a finer series rather than requested directly. */
const COINBASE_GRANULARITY: Record<Interval, { seconds: number; groupBy: number }> = {
  "1h": { seconds: 3600, groupBy: 1 },
  "4h": { seconds: 3600, groupBy: 4 },
  "1d": { seconds: 86400, groupBy: 1 },
  "1w": { seconds: 86400, groupBy: 7 },
  "1M": { seconds: 86400, groupBy: 30 }
};

/** Collapses n consecutive candles into one: first open, last close,
 *  highest high, lowest low. */
function groupCandles(candles: Candle[], size: number): Candle[] {
  if (size <= 1) return candles;
  const out: Candle[] = [];
  for (let i = 0; i + size <= candles.length; i += size) {
    const bucket = candles.slice(i, i + size);
    out.push({
      time: bucket[0].time,
      open: bucket[0].open,
      close: bucket[bucket.length - 1].close,
      high: Math.max(...bucket.map((c) => c.high)),
      low: Math.min(...bucket.map((c) => c.low))
    });
  }
  return out;
}

const TIMEOUT_MS = 7000;

async function getJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    // Unreachable, blocked, rate-limited or too slow — all the same to
    // the caller, which simply moves to the next venue.
    return null;
  }
}

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : NaN;
};

/* ---- tickers ---- */

async function bybitTickers(symbols: string[]): Promise<Record<string, Ticker> | null> {
  const json = await getJson("https://api.bybit.com/v5/market/tickers?category=spot");
  const list = json?.result?.list;
  if (!Array.isArray(list)) return null;

  const wanted = new Set(symbols);
  const out: Record<string, Ticker> = {};
  for (const t of list) {
    if (!wanted.has(t?.symbol)) continue;
    const last = num(t.lastPrice);
    if (!Number.isFinite(last)) continue;
    out[t.symbol] = {
      symbol: t.symbol,
      lastPrice: last,
      // Bybit reports the 24h change as a fraction, not a percentage.
      priceChangePercent: num(t.price24hPcnt) * 100,
      highPrice: num(t.highPrice24h),
      lowPrice: num(t.lowPrice24h),
      volume: num(t.volume24h)
    };
  }
  return Object.keys(out).length > 0 ? out : null;
}

async function okxTickers(symbols: string[]): Promise<Record<string, Ticker> | null> {
  const json = await getJson("https://www.okx.com/api/v5/market/tickers?instType=SPOT");
  const list = json?.data;
  if (!Array.isArray(list)) return null;

  const byInst = new Map(symbols.map((s) => [okxInst(s), s]));
  const out: Record<string, Ticker> = {};
  for (const t of list) {
    const symbol = byInst.get(t?.instId);
    if (!symbol) continue;
    const last = num(t.last);
    const open24h = num(t.open24h);
    if (!Number.isFinite(last)) continue;
    out[symbol] = {
      symbol,
      lastPrice: last,
      priceChangePercent: open24h > 0 ? ((last - open24h) / open24h) * 100 : 0,
      highPrice: num(t.high24h),
      lowPrice: num(t.low24h),
      volume: num(t.vol24h)
    };
  }
  return Object.keys(out).length > 0 ? out : null;
}

async function coinbaseTickers(symbols: string[]): Promise<Record<string, Ticker> | null> {
  // No all-products endpoint worth using here, so the listed symbols are
  // fetched together. There are eight of them.
  const results = await Promise.all(
    symbols.map(async (symbol) => {
      const stats = await getJson(
        `https://api.exchange.coinbase.com/products/${coinbaseProduct(symbol)}/stats`
      );
      const last = num(stats?.last);
      const open = num(stats?.open);
      if (!Number.isFinite(last) || last <= 0) return null;
      return [
        symbol,
        {
          symbol,
          lastPrice: last,
          priceChangePercent: open > 0 ? ((last - open) / open) * 100 : 0,
          highPrice: num(stats?.high),
          lowPrice: num(stats?.low),
          volume: num(stats?.volume)
        } as Ticker
      ] as const;
    })
  );

  const out: Record<string, Ticker> = {};
  for (const entry of results) {
    if (entry) out[entry[0]] = entry[1];
  }
  return Object.keys(out).length > 0 ? out : null;
}

async function binanceTickers(symbols: string[]): Promise<Record<string, Ticker> | null> {
  const query = encodeURIComponent(JSON.stringify(symbols));
  const json = await getJson(`${BINANCE_REST_BASE}/api/v3/ticker/24hr?symbols=${query}`);
  if (!Array.isArray(json)) return null;

  const out: Record<string, Ticker> = {};
  for (const t of json) {
    const last = num(t.lastPrice);
    if (!Number.isFinite(last)) continue;
    out[t.symbol] = {
      symbol: t.symbol,
      lastPrice: last,
      priceChangePercent: num(t.priceChangePercent),
      highPrice: num(t.highPrice),
      lowPrice: num(t.lowPrice),
      volume: num(t.volume)
    };
  }
  return Object.keys(out).length > 0 ? out : null;
}

/* ---- candles ---- */

/** Both Bybit and OKX return newest-first; charts need oldest-first. */
function toCandles(rows: any[], order: "newest-first" | "oldest-first"): Candle[] {
  const mapped = rows
    .map((k) => ({
      time: Math.floor(num(k[0]) / 1000),
      open: num(k[1]),
      high: num(k[2]),
      low: num(k[3]),
      close: num(k[4])
    }))
    .filter((c) => Number.isFinite(c.time) && Number.isFinite(c.close) && c.close > 0);
  return order === "newest-first" ? mapped.reverse() : mapped;
}

async function bybitCandles(symbol: string, interval: Interval, limit: number): Promise<Candle[] | null> {
  const json = await getJson(
    `https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}` +
      `&interval=${BYBIT_INTERVAL[interval]}&limit=${Math.min(limit, 1000)}`
  );
  const list = json?.result?.list;
  if (!Array.isArray(list) || list.length === 0) return null;
  const candles = toCandles(list, "newest-first");
  return candles.length > 0 ? candles : null;
}

async function okxCandles(symbol: string, interval: Interval, limit: number): Promise<Candle[] | null> {
  const json = await getJson(
    `https://www.okx.com/api/v5/market/candles?instId=${okxInst(symbol)}` +
      `&bar=${OKX_INTERVAL[interval]}&limit=${Math.min(limit, 300)}`
  );
  const list = json?.data;
  if (!Array.isArray(list) || list.length === 0) return null;
  const candles = toCandles(list, "newest-first");
  return candles.length > 0 ? candles : null;
}

async function coinbaseCandles(symbol: string, interval: Interval, limit: number): Promise<Candle[] | null> {
  const spec = COINBASE_GRANULARITY[interval];
  if (!spec) return null;
  const json = await getJson(
    `https://api.exchange.coinbase.com/products/${coinbaseProduct(symbol)}/candles?granularity=${spec.seconds}`
  );
  if (!Array.isArray(json) || json.length === 0) return null;

  // Coinbase orders [time, low, high, open, close, volume] with the time
  // already in seconds — a different column order from every other venue
  // here, so it is mapped by hand rather than through toCandles().
  const base = json
    .map((k: any[]) => ({
      time: Math.floor(num(k[0])),
      low: num(k[1]),
      high: num(k[2]),
      open: num(k[3]),
      close: num(k[4])
    }))
    .filter((c) => Number.isFinite(c.time) && Number.isFinite(c.close) && c.close > 0)
    .reverse();

  const grouped = groupCandles(base, spec.groupBy);
  const sliced = grouped.slice(-limit);
  return sliced.length > 0 ? sliced : null;
}

async function binanceCandles(symbol: string, interval: Interval, limit: number): Promise<Candle[] | null> {
  const json = await getJson(
    `${BINANCE_REST_BASE}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
  );
  if (!Array.isArray(json) || json.length === 0) return null;
  const candles = toCandles(json, "oldest-first");
  return candles.length > 0 ? candles : null;
}

/* ------------------------------------------------------------------ */
/* Public API — first venue that answers wins                          */
/* ------------------------------------------------------------------ */

export const MARKET_SOURCES = ["bybit", "okx", "coinbase", "binance"] as const;
export type MarketSource = (typeof MARKET_SOURCES)[number];

export async function fetchTickers(symbols: string[]): Promise<Record<string, Ticker>> {
  if (symbols.length === 0) return {};
  const attempts = [bybitTickers, okxTickers, coinbaseTickers, binanceTickers];
  for (const attempt of attempts) {
    const result = await attempt(symbols);
    if (result) return result;
  }
  // Every venue is unreachable. An empty map is honest; callers render
  // "—" rather than inventing a number.
  return {};
}

/** Last traded price for one symbol. */
export async function fetchPrice(symbol: string): Promise<number | null> {
  const bybit = await getJson(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}`);
  const bybitPrice = num(bybit?.result?.list?.[0]?.lastPrice);
  if (Number.isFinite(bybitPrice) && bybitPrice > 0) return bybitPrice;

  const okx = await getJson(`https://www.okx.com/api/v5/market/ticker?instId=${okxInst(symbol)}`);
  const okxPrice = num(okx?.data?.[0]?.last);
  if (Number.isFinite(okxPrice) && okxPrice > 0) return okxPrice;

  const coinbase = await getJson(
    `https://api.exchange.coinbase.com/products/${coinbaseProduct(symbol)}/ticker`
  );
  const coinbasePrice = num(coinbase?.price);
  if (Number.isFinite(coinbasePrice) && coinbasePrice > 0) return coinbasePrice;

  const binance = await getJson(`${BINANCE_REST_BASE}/api/v3/ticker/price?symbol=${symbol}`);
  const binancePrice = num(binance?.price);
  if (Number.isFinite(binancePrice) && binancePrice > 0) return binancePrice;

  return null;
}

export async function fetchCandles(symbol: string, interval: Interval, limit = 300): Promise<Candle[]> {
  const attempts = [bybitCandles, okxCandles, coinbaseCandles, binanceCandles];
  for (const attempt of attempts) {
    const result = await attempt(symbol, interval, limit);
    if (result) return result;
  }
  throw new Error(`No market data source could serve ${symbol} ${interval}`);
}

/** Which venues are answering right now. Used by the health endpoint so
 *  a regional block shows up as a reading rather than as silence. */
export async function probeSources(symbol = "BTCUSDT"): Promise<Record<MarketSource, number | null>> {
  const [bybit, okx, coinbase, binance] = await Promise.all([
    getJson(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}`),
    getJson(`https://www.okx.com/api/v5/market/ticker?instId=${okxInst(symbol)}`),
    getJson(`https://api.exchange.coinbase.com/products/${coinbaseProduct(symbol)}/ticker`),
    getJson(`${BINANCE_REST_BASE}/api/v3/ticker/price?symbol=${symbol}`)
  ]);
  const pick = (v: unknown) => {
    const n = num(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  return {
    bybit: pick(bybit?.result?.list?.[0]?.lastPrice),
    okx: pick(okx?.data?.[0]?.last),
    coinbase: pick(coinbase?.price),
    binance: pick(binance?.price)
  };
}
