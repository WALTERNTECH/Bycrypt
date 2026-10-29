"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiveTickers } from "@/hooks/useLiveTickers";
import { formatUsdt, formatPct } from "@/lib/format";
import { leveragedProfit, leveragedValue } from "@/lib/leverage";

interface Investment {
  amount: number;
  accrued: number;
  traded_symbol: string | null;
}

const HIDDEN_KEY = "krypton-assets-hidden";

/**
 * Total assets.
 *
 * The first block on the screen, and the reason most people open the
 * app: what they have, and what it did. Everything else on the home
 * screen is secondary to these two numbers, so they get the size.
 *
 * The eye toggle is not decoration — people check balances in public,
 * and the preference is remembered per device so it does not have to be
 * re-hidden on every visit.
 */
export function LiveBalanceCard({
  walletBalance,
  investments
}: {
  walletBalance: number;
  investments: Investment[];
}) {
  const symbols = Array.from(
    new Set(investments.map((i) => i.traded_symbol).filter((s): s is string => !!s))
  );
  const { tickers } = useLiveTickers(symbols);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(HIDDEN_KEY) === "1");
    } catch {
      /* private mode — default to visible */
    }
  }, []);

  function toggle() {
    setHidden((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(HIDDEN_KEY, next ? "1" : "0");
      } catch {
        /* nothing to persist to */
      }
      return next;
    });
  }

  const principal = investments.reduce((sum, inv) => sum + inv.amount, 0);

  // What the open positions would actually pay if closed now — the same
  // formula the server settles with, so this is never a different number
  // from what lands in the wallet.
  const settleValue = investments.reduce((sum, inv) => {
    const t = inv.traded_symbol ? tickers[inv.traded_symbol] : undefined;
    const profit = Math.max(inv.accrued, leveragedProfit(inv.amount, t?.priceChangePercent ?? 0), 0);
    return sum + inv.amount + profit;
  }, 0);

  const tradingLive = investments.reduce((sum, inv) => {
    const t = inv.traded_symbol ? tickers[inv.traded_symbol] : undefined;
    return sum + leveragedValue(inv.amount, t?.priceChangePercent ?? 0);
  }, 0);

  const totalAssets = walletBalance + settleValue;
  const liveDelta = tradingLive - principal;
  const livePct = principal > 0 ? (liveDelta / principal) * 100 : 0;
  const up = liveDelta >= 0;
  const hasPosition = principal > 0;

  const mask = (s: string) => (hidden ? "••••••" : s);

  return (
    <section className="relative overflow-hidden rounded-xl border border-border bg-surface px-4 py-4">
      {/* A faint bar motif behind the figures, the way an exchange hints
          at market activity without putting a real chart here — this
          block is about the account, not the market. */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 flex w-40 items-end gap-1 pr-3 opacity-[0.07]">
        {[38, 62, 30, 78, 52, 88, 44, 70, 34, 58].map((h, i) => (
          <span key={i} className="flex-1 rounded-sm bg-text-primary" style={{ height: `${h}%` }} />
        ))}
      </div>

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            onClick={toggle}
            aria-label={hidden ? "Show total assets" : "Hide total assets"}
            className="flex items-center gap-1.5 text-text-secondary transition-colors hover:text-text-primary"
          >
            <span className="text-[12px] font-medium">Total Assets</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} className="h-3.5 w-3.5">
              {hidden ? (
                <>
                  <path d="M3 3l18 18" strokeLinecap="round" />
                  <path d="M10.6 5.2A9.9 9.9 0 0 1 12 5c5 0 9 4.5 9 7 0 .9-.6 2.1-1.6 3.2M6.4 6.9C4.3 8.3 3 10.3 3 12c0 2.5 4 7 9 7 1.5 0 2.9-.4 4.1-1" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <path d="M3 12s3.6-7 9-7 9 7 9 7-3.6 7-9 7-9-7-9-7Z" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="2.6" />
                </>
              )}
            </svg>
          </button>

          <p className="mono-num mt-1 flex items-baseline gap-1.5 text-[30px] font-bold leading-none tracking-tight text-text-primary">
            {mask(formatUsdt(totalAssets))}
            <span className="text-[13px] font-semibold text-text-secondary">USD</span>
          </p>

          <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[12px]">
            <span className="font-medium text-text-secondary">Today&apos;s P&amp;L</span>
            {hasPosition ? (
              <>
                <span className={`mono-num font-semibold ${up ? "text-positive" : "text-negative"}`}>
                  {hidden ? "••••" : `${up ? "+" : ""}${formatUsdt(liveDelta)} USD`}
                </span>
                <span
                  className={`mono-num rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                    up ? "bg-positive-dim text-positive" : "bg-negative-dim text-negative"
                  }`}
                >
                  {hidden ? "••" : formatPct(livePct, { signed: true })}
                </span>
              </>
            ) : (
              <span className="mono-num font-semibold text-text-secondary">0.00 USD (0.00%)</span>
            )}
          </p>
        </div>

        <Link
          href="/deposit"
          className="shrink-0 rounded-full bg-brand px-6 py-2.5 text-[14px] font-bold text-ink transition-colors hover:bg-brand-hover active:opacity-80"
        >
          Deposit
        </Link>
      </div>

      <div className="relative mt-3.5 grid grid-cols-2 gap-3 border-t border-border pt-3">
        <Split label="Wallet" value={mask(formatUsdt(walletBalance, { withSymbol: true }))} />
        <Split
          label="In positions"
          value={hasPosition ? mask(formatUsdt(tradingLive, { withSymbol: true })) : "—"}
        />
      </div>
    </section>
  );
}

function Split({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-text-secondary">{label}</p>
      <p className="mono-num mt-0.5 text-[15px] font-bold text-text-primary">{value}</p>
    </div>
  );
}
