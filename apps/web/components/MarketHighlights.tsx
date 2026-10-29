"use client";

import Link from "next/link";
import { useLiveTickers } from "@/hooks/useLiveTickers";
import { formatPct } from "@/lib/format";

/**
 * The 2×2 market cards.
 *
 * Each card is a category with the one symbol that currently defines it:
 * the biggest riser, the biggest faller, the most traded, and Bitcoin as
 * the fixed reference everyone checks first.
 *
 * The categories are derived from live data rather than curated, so the
 * cards stay true without anyone maintaining a list — and an empty
 * market feed leaves them out entirely instead of rendering placeholders.
 */
export function MarketHighlights({ rows }: { rows: { symbol: string; display_name: string }[] }) {
  const { tickers } = useLiveTickers(rows.map((r) => r.symbol));

  const withData = rows
    .map((r) => ({ ...r, t: tickers[r.symbol] }))
    .filter((r): r is typeof r & { t: NonNullable<typeof r.t> } => !!r.t);

  if (withData.length === 0) return null;

  const byChange = [...withData].sort((a, b) => b.t.priceChangePercent - a.t.priceChangePercent);
  const byVolume = [...withData].sort((a, b) => b.t.volume - a.t.volume);
  const btc = withData.find((r) => r.symbol === "BTCUSDT") ?? byVolume[0];

  const cards = [
    { title: "Top Gainer", pick: byChange[0] },
    { title: "Top Loser", pick: byChange[byChange.length - 1] },
    { title: "Most Active", pick: byVolume[0] },
    { title: "Bitcoin", pick: btc }
  ].filter((c) => !!c.pick);

  return (
    <div className="mt-5 grid grid-cols-2 gap-2.5">
      {cards.map((c) => {
        const up = c.pick.t.priceChangePercent >= 0;
        const coin = c.pick.symbol.replace("USDT", "");
        return (
          <Link
            key={c.title}
            href={`/markets/${c.pick.symbol}`}
            className="rounded-xl bg-surface-2 px-3.5 py-3 transition-colors hover:bg-surface-3"
          >
            <div className="flex items-center gap-1">
              <span className="text-[13px] font-bold text-text-primary">{c.title}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="h-3 w-3 text-text-tertiary">
                <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/15 text-[9px] font-bold text-text-primary">
                {coin.slice(0, 3)}
              </span>
              <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-text-secondary">{coin}</span>
              <span
                className={`mono-num shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                  up ? "bg-positive-dim text-positive" : "bg-negative-dim text-negative"
                }`}
              >
                {formatPct(c.pick.t.priceChangePercent, { signed: true })}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
