"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiveTickers } from "@/hooks/useLiveTickers";
import { buttonStyles } from "./ui";

function todayKey(): string {
  return `krypton-suggestion-dismissed-${new Date().toDateString()}`;
}

// Signal card. Deliberately a dark surface with a gold accent rather than
// a solid gold slab — a full-bleed bright fill fights the rest of the
// screen and reads as an ad, not a trading signal.
export function CoinSuggestion({ rows }: { rows: { symbol: string; display_name: string }[] }) {
  const symbols = rows.map((r) => r.symbol);
  const { tickers } = useLiveTickers(symbols);
  const [dismissed, setDismissed] = useState(true); // hidden until localStorage is read, to avoid a flash

  useEffect(() => {
    setDismissed(Boolean(localStorage.getItem(todayKey())));
  }, []);

  if (dismissed) return null;

  const ranked = Object.values(tickers).sort((a, b) => b.priceChangePercent - a.priceChangePercent);
  const top = ranked[0];
  if (!top || top.priceChangePercent <= 0) return null;

  const displayName = rows.find((r) => r.symbol === top.symbol)?.display_name ?? top.symbol.replace("USDT", "");
  const coin = top.symbol.replace("USDT", "");

  function dismiss() {
    localStorage.setItem(todayKey(), "1");
    setDismissed(true);
  }

  return (
    <div className="rise-in relative mt-4 overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      {/* gold accent rail */}
      <span className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-brand to-brand/30" />

      <div className="flex items-center gap-3 py-3.5 pl-4 pr-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand/25 bg-brand/10 text-brand">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-5 w-5">
            <path d="M4 15 10 9l4 4 6-8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M15 5h5v5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand">Signal</span>
            <span className="h-1 w-1 rounded-full bg-text-tertiary" />
            <span className="text-[10px] font-medium text-text-tertiary">Top mover today</span>
          </div>
          <p className="mt-0.5 truncate text-sm font-bold text-text-primary">
            Buy {coin}
            <span className="ml-1.5 font-medium text-text-secondary">{displayName}</span>
          </p>
          <p className="mono-num text-xs font-bold text-positive">+{top.priceChangePercent.toFixed(2)}%</p>
        </div>

        <Link href={`/trade/${top.symbol}`} className={buttonStyles({ variant: "primary", size: "sm" })}>
          Trade
        </Link>

        <button
          onClick={dismiss}
          aria-label="Dismiss signal"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-surface-3 hover:text-text-primary"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
