"use client";

import { useState } from "react";
import Link from "next/link";
import { useLiveTickers } from "@/hooks/useLiveTickers";
import { useFavourites } from "@/hooks/useFavourites";
import { formatPct } from "@/lib/format";

type Tab = "favourites" | "hot" | "gainers" | "losers" | "turnover";

const TABS: { id: Tab; label: string }[] = [
  { id: "favourites", label: "Favourites" },
  { id: "hot", label: "Hot" },
  { id: "gainers", label: "Gainers" },
  { id: "losers", label: "Losers" },
  { id: "turnover", label: "Turnover" }
];

interface Row {
  symbol: string;
  display_name: string;
}

/**
 * The market board on the home screen: a tab strip over a plain list.
 *
 * Every tab is derived from the live feed rather than curated, so nothing
 * here needs maintaining and no tab can go stale. Hot ranks by the size
 * of the move in either direction; Turnover ranks by traded volume.
 *
 * No borders, no cards, no column rules. A list on white separated by
 * nothing but spacing and weight is what an exchange home screen looks
 * like — the previous two-column grid of outlined tiles is what made this
 * screen read as a template.
 */
export function MarketBoard({ rows }: { rows: Row[] }) {
  const [tab, setTab] = useState<Tab>("hot");
  const { tickers, connected } = useLiveTickers(rows.map((r) => r.symbol));
  const { isFavourite, toggle, favourites } = useFavourites();

  const withData = rows.map((r) => ({ ...r, t: tickers[r.symbol] }));

  const sorted = (() => {
    const live = withData.filter((r) => !!r.t);
    switch (tab) {
      case "favourites":
        return withData.filter((r) => favourites.includes(r.symbol));
      case "gainers":
        return [...live].sort((a, b) => b.t!.priceChangePercent - a.t!.priceChangePercent);
      case "losers":
        return [...live].sort((a, b) => a.t!.priceChangePercent - b.t!.priceChangePercent);
      case "turnover":
        return [...live].sort((a, b) => b.t!.volume * b.t!.lastPrice - a.t!.volume * a.t!.lastPrice);
      case "hot":
      default:
        return [...live].sort(
          (a, b) => Math.abs(b.t!.priceChangePercent) - Math.abs(a.t!.priceChangePercent)
        );
    }
  })();

  const shown = sorted.slice(0, 6);

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between">
        <div className="-ml-4 flex min-w-0 flex-1 gap-5 overflow-x-auto pl-4 pr-2 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className="relative shrink-0 pb-2 text-[14px] transition-colors"
              >
                <span className={active ? "font-bold text-text-primary" : "font-medium text-text-tertiary"}>
                  {item.label}
                </span>
                {active && (
                  <span className="absolute inset-x-0 -bottom-px mx-auto h-[3px] w-5 rounded-full bg-brand" />
                )}
              </button>
            );
          })}
        </div>
        <Link
          href="/markets"
          className="shrink-0 pb-2 pl-3 text-[12px] font-semibold text-text-tertiary transition-colors hover:text-text-primary"
        >
          More
        </Link>
      </div>

      <div className="mt-1">
        {shown.length === 0 ? (
          <p className="py-6 text-center text-[12px] text-text-tertiary">
            {tab === "favourites"
              ? "Star a market and it shows up here."
              : connected
                ? "No markets to show."
                : "Connecting to the market feed…"}
          </p>
        ) : (
          shown.map((row) => {
            const t = row.t;
            const up = (t?.priceChangePercent ?? 0) >= 0;
            const coin = row.symbol.replace("USDT", "");
            const decimals = t && t.lastPrice >= 100 ? 2 : 6;
            const starred = isFavourite(row.symbol);
            return (
              <div key={row.symbol} className="flex items-center gap-2 py-2.5">
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
                    className={`h-[15px] w-[15px] ${starred ? "" : "text-[#C6C9CF]"}`}
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
                    <p className="mono-num mt-0.5 text-[11px] text-text-tertiary">
                      {t ? `Vol ${compact(t.volume * t.lastPrice)}` : "—"}
                    </p>
                  </div>

                  <p className="mono-num shrink-0 text-right text-[14px] font-semibold text-text-primary">
                    {t ? t.lastPrice.toLocaleString("en-US", { maximumFractionDigits: decimals }) : "—"}
                  </p>

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
          })
        )}
      </div>
    </section>
  );
}

function compact(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}
