"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLiveTickers } from "@/hooks/useLiveTickers";
import { useFavourites } from "@/hooks/useFavourites";
import { formatPct } from "@/lib/format";

export interface MarketSymbolRow {
  symbol: string;
  display_name: string;
}

type Category = "all" | "gainers" | "losers" | "favourites";

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "all", label: "All" },
  { id: "gainers", label: "Gainers" },
  { id: "losers", label: "Losers" },
  { id: "favourites", label: "Favourites" }
];

function priceDecimals(price: number): number {
  if (price >= 100) return 2;
  if (price >= 1) return 3;
  return 6;
}

/**
 * The full market list.
 *
 * A chips row filters it, a star marks a favourite, and a query from the
 * header search narrows it by name or symbol — the search used to push a
 * ?q= this page never read, so it looked broken.
 *
 * Borderless by design: no table rules, no card outline, no header band.
 * Separation is spacing and type weight.
 */
export function MarketTable({ rows, query = "" }: { rows: MarketSymbolRow[]; query?: string }) {
  const [category, setCategory] = useState<Category>("all");
  const { tickers, connected } = useLiveTickers(rows.map((r) => r.symbol));
  const { isFavourite, toggle, favourites } = useFavourites();

  const visible = useMemo(() => {
    const q = query.trim().toUpperCase();
    let list = rows.map((r) => ({ ...r, t: tickers[r.symbol] }));

    if (q) {
      list = list.filter(
        (r) => r.symbol.includes(q) || r.display_name.toUpperCase().includes(q)
      );
    }

    switch (category) {
      case "favourites":
        return list.filter((r) => favourites.includes(r.symbol));
      case "gainers":
        return list
          .filter((r) => r.t && r.t.priceChangePercent > 0)
          .sort((a, b) => b.t!.priceChangePercent - a.t!.priceChangePercent);
      case "losers":
        return list
          .filter((r) => r.t && r.t.priceChangePercent < 0)
          .sort((a, b) => a.t!.priceChangePercent - b.t!.priceChangePercent);
      default:
        return list;
    }
  }, [rows, tickers, category, favourites, query]);

  return (
    <div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CATEGORIES.map((c) => {
          const active = category === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
                active
                  ? "bg-[#17181C] text-white"
                  : "bg-surface-2 text-text-secondary hover:bg-surface-3 hover:text-text-primary"
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-text-tertiary">
          {query.trim() ? `Matching “${query.trim()}”` : `${visible.length} markets`}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? "live-dot bg-positive" : "bg-text-tertiary"}`} />
          {connected ? "Live" : "Connecting…"}
        </span>
      </div>

      <div className="mt-1">
        {visible.length === 0 && (
          <p className="py-8 text-center text-[12px] text-text-tertiary">
            {category === "favourites"
              ? "Star a market and it shows up here."
              : "Nothing matches that."}
          </p>
        )}

        {visible.map((row) => {
          const t = row.t;
          const up = (t?.priceChangePercent ?? 0) >= 0;
          const decimals = t ? priceDecimals(t.lastPrice) : 2;
          const coin = row.symbol.replace("USDT", "");
          const starred = isFavourite(row.symbol);
          return (
            <div key={row.symbol} className="flex items-center gap-2.5 py-3">
              <button
                onClick={() => toggle(row.symbol)}
                aria-label={starred ? `Unstar ${coin}` : `Star ${coin}`}
                className="shrink-0 p-0.5"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill={starred ? "#F7A600" : "none"}
                  stroke={starred ? "#F7A600" : "currentColor"}
                  strokeWidth={1.7}
                  className={`h-4 w-4 ${starred ? "" : "text-[#C6C9CF]"}`}
                >
                  <path
                    d="m12 4 2.3 4.9 5.2.7-3.8 3.7.9 5.3L12 16.1 7.4 18.6l.9-5.3L4.5 9.6l5.2-.7Z"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <Link href={`/markets/${row.symbol}`} className="flex min-w-0 flex-1 items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold text-text-primary">
                    {coin}
                    <span className="ml-0.5 text-[11px] font-medium text-text-tertiary">/USDT</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-text-tertiary">{row.display_name}</p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="mono-num text-[14px] font-semibold text-text-primary">
                    {t ? t.lastPrice.toLocaleString("en-US", { maximumFractionDigits: decimals }) : "—"}
                  </p>
                  <p className="mono-num mt-0.5 text-[10px] text-text-tertiary">
                    {t ? `H ${t.highPrice.toLocaleString("en-US", { maximumFractionDigits: decimals })}` : ""}
                  </p>
                </div>

                <span
                  className={`mono-num ml-1 flex h-7 w-[72px] shrink-0 items-center justify-center rounded text-[12px] font-bold text-white ${
                    up ? "bg-positive" : "bg-negative"
                  }`}
                >
                  {t ? formatPct(t.priceChangePercent, { signed: true }) : "—"}
                </span>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
