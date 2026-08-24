"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiveTickers } from "@/hooks/useLiveTickers";

function todayKey(): string {
  return `krypton-suggestion-dismissed-${new Date().toDateString()}`;
}

export function CoinSuggestion({ rows }: { rows: { symbol: string; display_name: string }[] }) {
  const symbols = rows.map((r) => r.symbol);
  const { tickers } = useLiveTickers(symbols);
  const [dismissed, setDismissed] = useState(true); // default hidden until we check localStorage, to avoid a flash

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
    <Link
      href={`/trade/${top.symbol}`}
      className="relative mt-4 flex items-center gap-3 overflow-hidden rounded-xl bg-gradient-to-r from-brand to-brand-hover py-3.5 pl-4 pr-10 shadow-lg shadow-brand/25 ring-1 ring-white/10 transition-transform hover:scale-[1.01] active:scale-[0.99]"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-base/15 text-base">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-5 w-5">
          <path d="M4 15 10 9l4 4 6-8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15 5h5v5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-extrabold leading-tight text-base">
          {displayName} is up {top.priceChangePercent.toFixed(1)}% today
        </p>
        <p className="mt-0.5 text-xs font-bold leading-tight text-base/80">Buy {coin} now →</p>
      </div>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          dismiss();
        }}
        aria-label="Dismiss"
        className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-base/15 text-base transition-colors hover:bg-base/25"
      >
        ×
      </button>
    </Link>
  );
}
