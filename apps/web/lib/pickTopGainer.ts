import { fetchTickers } from "@/lib/binance";
import { pickSignal } from "@/lib/signal";

/**
 * Chooses the display symbol recorded against a new position when the
 * user didn't pick one explicitly.
 *
 * This mirrors the on-screen signal rather than always grabbing the best
 * 24h performer, so the coin a user is told about is the coin their
 * position is logged against. It places no real order — execution is
 * managed externally by the operator.
 */
export async function pickSignalSymbol(symbols: string[]): Promise<string | null> {
  if (symbols.length === 0) return null;
  try {
    const tickers = await fetchTickers(symbols);
    const rows = symbols.map((s) => ({ symbol: s, display_name: s.replace("USDT", "") }));
    return pickSignal(rows, tickers)?.symbol ?? symbols[0];
  } catch {
    return symbols[0] ?? null;
  }
}

/** @deprecated retained so existing imports keep resolving. */
export const pickTopGainer = pickSignalSymbol;
