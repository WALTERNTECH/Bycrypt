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

  function dismiss() {
    localStorage.setItem(todayKey(), "1");
    setDismissed(true);
  }

  return (
    <Link
      href={`/trade/${top.symbol}`}
      className="relative mt-4 block rounded-xl border border-brand/40 bg-brand/[0.08] py-3 pl-3.5 pr-9 transition-colors hover:bg-brand/[0.12]"
    >
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          dismiss();
        }}
        aria-label="Dismiss"
        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-panel-2 hover:text-text-primary"
      >
        ×
      </button>
      <p className="text-xs font-bold text-brand">
        {displayName} is up {top.priceChangePercent.toFixed(1)}% today — Buy {top.symbol.replace("USDT", "")}
      </p>
      <p className="mt-0.5 text-[11px] text-text-secondary">Tap to view the chart and trade it</p>
    </Link>
  );
}
