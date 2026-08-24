"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CandleChart } from "@/components/CandleChart";
import { useLiveTickers } from "@/hooks/useLiveTickers";
import { FormField, inputClass, buttonClass } from "@/components/FormField";
import { formatUsdt, formatPct } from "@/lib/format";
import { SUPPORTED_INTERVALS, type Interval } from "@/lib/binance";

interface OpenPosition {
  id: string;
  amount: number;
  accrued: number;
  symbol: string;
}

interface OrderTicket {
  side: "BUY" | "SELL";
  symbol: string;
  amount: number;
  time: string;
}

export function TradeChartClient({
  symbol,
  displayName,
  walletBalance,
  tierId,
  lockupDays,
  minAmount,
  openPosition
}: {
  symbol: string;
  displayName: string;
  walletBalance: number;
  tierId: number | null;
  lockupDays: number;
  minAmount: number;
  openPosition: OpenPosition | null;
}) {
  const router = useRouter();
  const [interval, setInterval] = useState<Interval>("1h");
  const { tickers } = useLiveTickers([symbol]);
  const t = tickers[symbol];
  const up = (t?.priceChangePercent ?? 0) >= 0;

  const [panel, setPanel] = useState<"none" | "buy" | "sell">("none");
  const [amount, setAmount] = useState("");
  const [transactionKey, setTransactionKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<OrderTicket | null>(null);

  const parsedAmount = parseFloat(amount);
  const amountValid = !Number.isNaN(parsedAmount) && parsedAmount >= minAmount && parsedAmount <= walletBalance;
  const positionHere = openPosition && openPosition.symbol === symbol ? openPosition : null;
  const positionElsewhere = openPosition && openPosition.symbol !== symbol ? openPosition : null;
  const sellValue = openPosition ? openPosition.amount + openPosition.accrued : 0;

  async function handleBuy(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!tierId) {
      setError("No trading plan is available right now.");
      return;
    }
    if (!amountValid) {
      setError(`Enter an amount between ${minAmount} and ${formatUsdt(walletBalance)} USDT.`);
      return;
    }
    if (!transactionKey) {
      setError("Enter your transaction key.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/investments/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier_id: tierId, amount: parsedAmount, transaction_key: transactionKey, symbol })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Order could not be placed.");
        return;
      }
      setTicket({ side: "BUY", symbol, amount: parsedAmount, time: new Date().toLocaleString() });
      setPanel("none");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleClosePosition(position: OpenPosition) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/investments/${position.id}/cashout`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Order could not be placed.");
        return;
      }
      setTicket({ side: "SELL", symbol: position.symbol, amount: position.amount + position.accrued, time: new Date().toLocaleString() });
      setPanel("none");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (ticket) {
    return (
      <div className="rounded-2xl border border-border bg-panel p-6 text-center shadow-lg shadow-black/20">
        <div
          className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
            ticket.side === "BUY" ? "bg-positive/15" : "bg-negative/15"
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className={`h-6 w-6 ${ticket.side === "BUY" ? "text-positive" : "text-negative"}`}>
            <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="mt-3 text-lg font-bold text-text-primary">Order placed</p>
        <div className="mt-4 divide-y divide-border/60 rounded-xl border border-border text-left text-xs">
          <Row label="Symbol" value={ticket.symbol.replace("USDT", "/USDT")} />
          <Row label="Side" value={ticket.side} valueClass={ticket.side === "BUY" ? "text-positive" : "text-negative"} />
          <Row label="Amount" value={formatUsdt(ticket.amount, { withSymbol: true })} />
          <Row label="Status" value="Filled" valueClass="text-positive" />
          <Row label="Time" value={ticket.time} />
        </div>
        <div className="mt-5 flex justify-center gap-3">
          <Link href="/investments" className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-base transition-colors hover:bg-brand-hover">
            View investments
          </Link>
          <button onClick={() => setTicket(null)} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary hover:bg-panel-2">
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <Link href="/trade" className="text-xs font-medium text-text-secondary hover:text-brand">
          ← Markets
        </Link>
      </div>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-text-secondary">{displayName}</p>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="mono-num text-3xl font-extrabold text-text-primary">
              {t ? `$${t.lastPrice.toLocaleString("en-US", { maximumFractionDigits: t.lastPrice >= 100 ? 2 : 6 })}` : "—"}
            </span>
            <span className={`mono-num text-sm font-semibold ${up ? "text-positive" : "text-negative"}`}>
              {t ? formatPct(t.priceChangePercent, { signed: true }) : ""}
            </span>
          </div>
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-panel p-1">
          {SUPPORTED_INTERVALS.map((iv) => (
            <button
              key={iv}
              onClick={() => setInterval(iv)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                interval === iv ? "bg-brand text-base" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {iv.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <CandleChart symbol={symbol} interval={interval} />
      </div>

      {/* A position open on a different coin blocks buying here until closed */}
      {positionElsewhere && panel === "none" && (
        <div className="mt-3 rounded-xl border border-brand/40 bg-brand/[0.08] p-4">
          <p className="text-sm font-bold text-brand">
            Open position: {positionElsewhere.symbol.replace("USDT", "")}
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            Krypton runs one position at a time. Close your {positionElsewhere.symbol.replace("USDT", "")} position (worth{" "}
            <span className="mono-num font-semibold text-text-primary">{formatUsdt(sellValue, { withSymbol: true })}</span>) to free up your
            wallet balance and trade {symbol.replace("USDT", "")} instead.
          </p>
          <button
            onClick={() => handleClosePosition(positionElsewhere)}
            disabled={loading}
            className="mt-3 rounded-lg bg-negative px-4 py-2 text-sm font-bold text-base transition-colors hover:brightness-110 disabled:opacity-60"
          >
            {loading ? "Closing…" : `Close ${positionElsewhere.symbol.replace("USDT", "")} position`}
          </button>
          {error && <p className="mt-2 text-sm text-negative">{error}</p>}
        </div>
      )}

      {/* Order controls — docked right under the chart, MT5-style */}
      <div className="mt-3 rounded-xl border border-border bg-panel p-4">
        {panel === "none" && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => !positionElsewhere && setPanel("buy")}
              disabled={!!positionElsewhere}
              title={positionElsewhere ? "Close your open position first" : undefined}
              className="rounded-lg bg-positive py-3 text-sm font-bold text-base transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Buy
            </button>
            <button
              onClick={() => positionHere && setPanel("sell")}
              disabled={!positionHere}
              className="rounded-lg bg-negative py-3 text-sm font-bold text-base transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Sell
            </button>
          </div>
        )}

        {panel === "buy" && (
          <form onSubmit={handleBuy} className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-positive">Buy {symbol.replace("USDT", "")}</p>
              <p className="text-[11px] text-text-secondary">{lockupDays}-day plan</p>
            </div>
            <FormField label="Amount (USDT)" hint={`Between ${minAmount} and ${formatUsdt(walletBalance)} available.`}>
              <input
                inputMode="decimal"
                autoFocus
                className={inputClass}
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder={String(minAmount)}
              />
            </FormField>
            <FormField label="Transaction key">
              <input
                required
                type="password"
                className={inputClass}
                value={transactionKey}
                onChange={(e) => setTransactionKey(e.target.value)}
                placeholder="Your transaction key"
              />
            </FormField>
            {error && <p className="text-sm text-negative">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={loading} className={`${buttonClass} flex-1 !bg-positive hover:!brightness-110`}>
                {loading ? "Placing order…" : "Place Buy Order"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPanel("none");
                  setError(null);
                }}
                className="rounded-lg border border-border px-4 text-sm font-semibold text-text-secondary hover:bg-panel-2"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {panel === "sell" && positionHere && (
          <div className="space-y-3">
            <p className="text-sm font-bold text-negative">Sell {symbol.replace("USDT", "")}</p>
            <p className="text-xs text-text-secondary">
              This closes your position and moves{" "}
              <span className="mono-num font-semibold text-text-primary">{formatUsdt(sellValue, { withSymbol: true })}</span> (principal +
              confirmed accrued return) into your wallet balance.
            </p>
            {error && <p className="text-sm text-negative">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => handleClosePosition(positionHere)}
                disabled={loading}
                className="flex-1 rounded-lg bg-negative py-2.5 text-sm font-bold text-base transition-colors hover:brightness-110 disabled:opacity-60"
              >
                {loading ? "Placing order…" : "Confirm Sell"}
              </button>
              <button
                onClick={() => {
                  setPanel("none");
                  setError(null);
                }}
                className="rounded-lg border border-border px-4 text-sm font-semibold text-text-secondary hover:bg-panel-2"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-text-secondary">{label}</span>
      <span className={`mono-num font-semibold text-text-primary ${valueClass ?? ""}`}>{value}</span>
    </div>
  );
}
