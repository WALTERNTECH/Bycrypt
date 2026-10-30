"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiveTickers } from "@/hooks/useLiveTickers";
import { formatUsdt, formatPct } from "@/lib/format";
import { positionState, type OpenPositionRow } from "@/lib/position";
import { useSimulatedAccount } from "./SimulationProvider";
import { useLivePosition } from "./PositionLiveProvider";

const HIDDEN_KEY = "krypton-assets-hidden";

/**
 * Total assets.
 *
 * The first block on the screen, and the reason most people open the app:
 * what they have, and what it did. Everything else is secondary to these
 * two numbers, so they get the size.
 *
 * No border and no card. On a white interface an outlined box around the
 * headline figure fights it — the figure is the hierarchy. Deposit and
 * Withdraw sit directly beneath as the only two actions above the fold.
 *
 * The eye toggle is not decoration: people check balances in public, and
 * the preference is remembered per device so it does not have to be
 * re-hidden on every visit.
 */
export function LiveBalanceCard({
  walletBalance,
  positions
}: {
  walletBalance: number;
  positions: OpenPositionRow[];
}) {
  const symbols = Array.from(
    new Set(positions.map((p) => p.symbol).filter((s): s is string => !!s))
  );
  const { tickers } = useLiveTickers(symbols);
  const simulated = useSimulatedAccount();
  // One position runs at a time, so this is the server figure for it.
  const live = useLivePosition(positions[0]?.id ?? null);
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

  const staked = positions.reduce((sum, p) => sum + p.principal, 0);

  // Each position valued through the same formula the server settles
  // with, so this is never a different number from what lands in the
  // wallet on close.
  const totals = positions.reduce(
    (acc, p) => {
      const t = p.symbol ? tickers[p.symbol] : undefined;
      const s = live && live.id === p.id ? live.state : positionState({
        principal: p.principal,
        accrued: p.accrued,
        side: p.side,
        entryPrice: p.entryPrice,
        livePrice: t?.lastPrice ?? null,
        fallbackPct: t?.priceChangePercent ?? null,
        targetGainPct: p.targetGainPct,
        startedAt: p.startedAt,
        timeframe: p.timeframe,
        simulated
      });
      return { settles: acc.settles + s.settles, value: acc.value + s.value, pnl: acc.pnl + s.pnl };
    },
    { settles: 0, value: 0, pnl: 0 }
  );

  const totalAssets = walletBalance + totals.settles;
  const pnlPct = staked > 0 ? (totals.pnl / staked) * 100 : 0;
  const up = totals.pnl >= 0;
  const hasPosition = positions.length > 0;

  const mask = (s: string) => (hidden ? "••••••" : s);

  return (
    <section className="relative overflow-hidden pt-1">
      {/* A faint bar motif behind the figures, the way an exchange hints
          at market activity without putting a real chart here — this
          block is about the account, not the market. */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 flex h-20 w-40 items-end gap-1 opacity-[0.06]"
      >
        {[38, 62, 30, 78, 52, 88, 44, 70, 34, 58].map((h, i) => (
          <span key={i} className="flex-1 rounded-sm bg-text-primary" style={{ height: `${h}%` }} />
        ))}
      </div>

      <div className="relative">
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
                <path
                  d="M10.6 5.2A9.9 9.9 0 0 1 12 5c5 0 9 4.5 9 7 0 .9-.6 2.1-1.6 3.2M6.4 6.9C4.3 8.3 3 10.3 3 12c0 2.5 4 7 9 7 1.5 0 2.9-.4 4.1-1"
                  strokeLinecap="round"
                />
              </>
            ) : (
              <>
                <path d="M3 12s3.6-7 9-7 9 7 9 7-3.6 7-9 7-9-7-9-7Z" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="2.6" />
              </>
            )}
          </svg>
        </button>

        <p className="mono-num mt-1.5 flex items-baseline gap-1.5 text-[32px] font-bold leading-none tracking-tight text-text-primary">
          {mask(formatUsdt(totalAssets))}
          <span className="text-[13px] font-semibold text-text-secondary">USD</span>
        </p>

        <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[12px]">
          <span className="font-medium text-text-secondary">Position P&amp;L</span>
          {hasPosition ? (
            <>
              <span className={`mono-num font-semibold ${up ? "text-positive" : "text-negative"}`}>
                {hidden ? "••••" : `${up ? "+" : "-"}${formatUsdt(Math.abs(totals.pnl))} USD`}
              </span>
              <span
                className={`mono-num rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                  up ? "bg-positive-dim text-positive" : "bg-negative-dim text-negative"
                }`}
              >
                {hidden ? "••" : formatPct(pnlPct, { signed: true })}
              </span>
            </>
          ) : (
            <span className="mono-num font-semibold text-text-secondary">0.00 USD (0.00%)</span>
          )}
        </p>
      </div>

      {/* The only two actions above the fold. */}
      <div className="relative mt-4 flex items-center gap-2.5">
        <Link
          href="/deposit"
          className="flex h-10 flex-1 items-center justify-center rounded-lg bg-brand text-[14px] font-bold text-ink transition-colors hover:bg-brand-hover active:opacity-80"
        >
          Deposit
        </Link>
        <Link
          href="/withdraw"
          className="flex h-10 flex-1 items-center justify-center rounded-lg bg-surface-3 text-[14px] font-bold text-text-primary transition-colors hover:bg-[#E4E5EA] active:opacity-80"
        >
          Withdraw
        </Link>
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-3">
        <Split label="Wallet" value={mask(formatUsdt(walletBalance, { withSymbol: true }))} />
        <Split
          label="In positions"
          value={mask(formatUsdt(hasPosition ? totals.value : 0, { withSymbol: true }))}
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
