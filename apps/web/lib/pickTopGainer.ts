import { fetchTickers } from "@/lib/binance";

/**
 * Picks the best-performing active symbol by 24h % change, for display
 * purposes when a new investment is created ("the bot allocated your
 * funds into whatever's moving right now"). This does not place any
 * real order — actual trading execution is managed externally by the
 * platform operator (see PRD/TDD); accrued_return stays admin-controlled
 * via the bot-performance log, independent of this display symbol.
 */
export async function pickTopGainer(symbols: string[]): Promise<string | null> {
  if (symbols.length === 0) return null;
  try {
    const tickers = await fetchTickers(symbols);
    const ranked = Object.values(tickers).sort((a, b) => b.priceChangePercent - a.priceChangePercent);
    return ranked[0]?.symbol ?? symbols[0];
  } catch {
    return symbols[0] ?? null;
  }
}
