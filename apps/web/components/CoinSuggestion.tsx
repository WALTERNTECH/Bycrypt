"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiveTickers } from "@/hooks/useLiveTickers";
import { buttonStyles } from "./ui";
import { pickSignal, currentBucket } from "@/lib/signal";

function dismissKey(bucket: number): string {
  // Dismissal applies to the current call only — the next signal is new
  // information and should be allowed through.
  return `krypton-signal-dismissed-${bucket}`;
}

/**
 * The automated trading signal.
 *
 * Reads as a dark card with a coloured accent rather than a solid slab —
 * a full-bleed bright fill fights the rest of the screen and looks like
 * an ad rather than a trading call. The accent is green on a buy and red
 * on a sell, so the side is legible before any text is read.
 */
export function CoinSuggestion({ rows }: { rows: { symbol: string; display_name: string }[] }) {
  const symbols = rows.map((r) => r.symbol);
  const { tickers } = useLiveTickers(symbols);
  const [bucket, setBucket] = useState(() => currentBucket());
  const [dismissed, setDismissed] = useState(true); // hidden until localStorage is read, to avoid a flash

  // Roll onto the next signal window without a page reload.
  useEffect(() => {
    const id = setInterval(() => setBucket(currentBucket()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      setDismissed(Boolean(localStorage.getItem(dismissKey(bucket))));
    } catch {
      setDismissed(false);
    }
  }, [bucket]);

  if (dismissed) return null;

  const signal = pickSignal(rows, tickers);
  if (!signal) return null;

  const isBuy = signal.side === "BUY";
  const coin = signal.symbol.replace("USDT", "");

  function dismiss() {
    try {
      localStorage.setItem(dismissKey(bucket), "1");
    } catch {
      /* private mode */
    }
    setDismissed(true);
  }

  return (
    <div className="rise-in relative mt-4 overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <span
        className={`absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b ${
          isBuy ? "from-positive to-positive/30" : "from-negative to-negative/30"
        }`}
      />

      <div className="flex items-center gap-3 py-3.5 pl-4 pr-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
            isBuy ? "border-positive/25 bg-positive/10 text-positive" : "border-negative/25 bg-negative/10 text-negative"
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-5 w-5">
            {isBuy ? (
              <>
                <path d="M4 15 10 9l4 4 6-8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M15 5h5v5" strokeLinecap="round" strokeLinejoin="round" />
              </>
            ) : (
              <>
                <path d="M4 9l6 6 4-4 6 8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M15 19h5v-5" strokeLinecap="round" strokeLinejoin="round" />
              </>
            )}
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${isBuy ? "text-positive" : "text-negative"}`}
            >
              {isBuy ? "Buy signal" : "Sell signal"}
            </span>
            <span className="h-1 w-1 rounded-full bg-text-tertiary" />
            <span className="text-[10px] font-medium text-text-tertiary">
              {isBuy ? "Momentum up" : "Momentum down"}
            </span>
          </div>
          <p className="mt-0.5 truncate text-sm font-bold text-text-primary">
            {isBuy ? "Buy" : "Sell"} {coin}
            <span className="ml-1.5 font-medium text-text-secondary">{signal.displayName}</span>
          </p>
          <p className={`mono-num text-xs font-bold ${isBuy ? "text-positive" : "text-negative"}`}>
            {signal.changePct >= 0 ? "+" : ""}
            {signal.changePct.toFixed(2)}%
          </p>
        </div>

        <Link
          href={`/trade/${signal.symbol}`}
          className={buttonStyles({ variant: isBuy ? "success" : "danger", size: "sm" })}
        >
          {isBuy ? "Buy" : "Sell"}
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
