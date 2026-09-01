"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CandleChart } from "@/components/CandleChart";
import { useLiveTickers } from "@/hooks/useLiveTickers";
import { FormField, inputClass } from "@/components/FormField";
import { SecretInput } from "@/components/SecretInput";
import { Button, ButtonLink } from "@/components/ui";
import { formatUsdt, formatPct } from "@/lib/format";
import { settlementOf } from "@/components/SettlementValue";
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

  // A sell signal deep-links here with ?action=sell so the close ticket is
  // already open — otherwise the user lands on the buy panel having been
  // told to sell.
  const searchParams = useSearchParams();
  const [panel, setPanel] = useState<"none" | "buy" | "sell">(
    searchParams.get("action") === "sell" && openPosition ? "sell" : "none"
  );
  const [amount, setAmount] = useState("");
  const [transactionKey, setTransactionKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<OrderTicket | null>(null);

  const parsedAmount = parseFloat(amount);
  const amountValid = !Number.isNaN(parsedAmount) && parsedAmount >= minAmount && parsedAmount <= walletBalance;
  const positionElsewhere = openPosition && openPosition.symbol !== symbol ? openPosition : null;
  const coin = symbol.replace("USDT", "");
  // The coin actually held, which may differ from the chart on screen.
  const heldCoin = openPosition ? openPosition.symbol.replace("USDT", "") : null;
  // Same formula the server settles with, so the ticket agrees with the payout.
  const settleValue = openPosition
    ? settlementOf(
        openPosition.amount,
        openPosition.accrued,
        tickers[openPosition.symbol]?.priceChangePercent ?? 0
      ).total
    : 0;

  function applyPreset(fraction: number) {
    const v = walletBalance * fraction;
    setAmount(v > 0 ? v.toFixed(2) : "");
  }

  async function handleBuy(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!tierId) return setError("No trading plan is available right now.");
    if (!amountValid) {
      return setError(`Enter an amount between ${minAmount} and ${formatUsdt(walletBalance)} USDT.`);
    }
    if (!transactionKey) return setError("Enter your transaction key.");

    setLoading(true);
    try {
      const res = await fetch("/api/investments/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier_id: tierId, amount: parsedAmount, transaction_key: transactionKey, symbol })
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "Order could not be placed.");
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
      if (!res.ok) return setError(data.error ?? "Could not close this position.");
      // Use the server-reported credit rather than a local estimate — it
      // is the amount that actually moved.
      setTicket({
        side: "SELL",
        symbol: position.symbol,
        amount: typeof data?.credited === "number" ? data.credited : settleValue,
        time: new Date().toLocaleString()
      });
      setPanel("none");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  /* ---------- fill ticket ---------- */
  if (ticket) {
    const isBuy = ticket.side === "BUY";
    return (
      <div className="rise-in rounded-2xl border border-border bg-surface p-6 text-center shadow-lift">
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border ${
            isBuy ? "border-positive/30 bg-positive/10" : "border-negative/30 bg-negative/10"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            className={`h-7 w-7 ${isBuy ? "text-positive" : "text-negative"}`}
          >
            <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="mt-3.5 text-lg font-extrabold text-text-primary">Order filled</p>
        <p className="mt-1 text-xs text-text-secondary">
          {isBuy
            ? "Your position is now open and tracking the market."
            : "Funds have moved back into your Krypton wallet."}
        </p>

        <div className="mt-5 divide-y divide-border overflow-hidden rounded-xl border border-border text-left text-xs">
          <Row label="Symbol" value={ticket.symbol.replace("USDT", "/USDT")} />
          <Row label="Side" value={ticket.side} valueClass={isBuy ? "text-positive" : "text-negative"} />
          <Row label="Amount" value={formatUsdt(ticket.amount, { withSymbol: true })} />
          <Row label="Status" value="Filled" valueClass="text-positive" />
          <Row label="Time" value={ticket.time} />
        </div>

        <div className="mt-5 flex gap-2.5">
          <ButtonLink href="/investments" variant="primary" size="md" className="flex-1">
            View positions
          </ButtonLink>
          <Button variant="secondary" size="md" onClick={() => setTicket(null)}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  /* ---------- chart + order pad ---------- */
  return (
    <div>
      <Link
        href="/trade"
        className="inline-flex items-center gap-1 text-xs font-bold text-text-secondary transition-colors hover:text-brand"
      >
        <span aria-hidden>&larr;</span> Markets
      </Link>

      <div className="mt-2.5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-strong bg-surface-2 text-[10px] font-bold text-text-secondary">
              {coin.slice(0, 3)}
            </span>
            <div>
              <p className="text-sm font-bold text-text-primary">
                {coin}
                <span className="ml-1 text-xs font-medium text-text-tertiary">/USDT</span>
              </p>
              <p className="text-[10px] text-text-tertiary">{displayName}</p>
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span className="mono-num text-[28px] font-extrabold leading-none text-text-primary">
              {t
                ? `$${t.lastPrice.toLocaleString("en-US", { maximumFractionDigits: t.lastPrice >= 100 ? 2 : 6 })}`
                : "—"}
            </span>
            <span
              className={`mono-num rounded px-1.5 py-0.5 text-xs font-bold ${
                up ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"
              }`}
            >
              {t ? formatPct(t.priceChangePercent, { signed: true }) : "—"}
            </span>
          </div>
        </div>

        <div className="flex gap-0.5 rounded-lg border border-border bg-surface p-0.5">
          {SUPPORTED_INTERVALS.map((iv) => (
            <button
              key={iv}
              onClick={() => setInterval(iv)}
              className={`rounded-md px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
                interval === iv ? "bg-surface-3 text-brand" : "text-text-tertiary hover:text-text-primary"
              }`}
            >
              {iv.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3.5 overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
        <CandleChart symbol={symbol} interval={interval} />
      </div>

      {/* Holding a different coin: offer the exit rather than a dead end */}
      {positionElsewhere && panel === "none" && (
        <div className="mt-3 rounded-2xl border border-brand/30 bg-brand-dim p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-brand/30 bg-brand/10 text-[10px] font-bold text-brand">
              {positionElsewhere.symbol.replace("USDT", "").slice(0, 3)}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-brand">
                {positionElsewhere.symbol.replace("USDT", "")} position is open
              </p>
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                Krypton runs one position at a time. Close it to release{" "}
                <span className="mono-num font-bold text-text-primary">
                  {formatUsdt(settleValue, { withSymbol: true })}
                </span>{" "}
                back to your wallet, then you can trade {coin}.
              </p>
            </div>
          </div>
          <Button
            variant="danger"
            size="md"
            fullWidth
            className="mt-3"
            onClick={() => handleClosePosition(positionElsewhere)}
            disabled={loading}
          >
            {loading ? "Closing…" : `Close ${positionElsewhere.symbol.replace("USDT", "")} position`}
          </Button>
          {error && <p className="mt-2 text-xs font-medium text-negative">{error}</p>}
        </div>
      )}

      {/* Order pad — docked under the chart, MT5 style */}
      <div className="mt-3 rounded-2xl border border-border bg-surface p-3.5 shadow-card">
        {panel === "none" && (
          <>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                Available to trade
              </span>
              <span className="mono-num text-sm font-bold text-text-primary">
                {formatUsdt(walletBalance, { withSymbol: true })}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Button
                variant="success"
                size="lg"
                onClick={() => setPanel("buy")}
                disabled={!!positionElsewhere}
                title={positionElsewhere ? "Close your open position first" : undefined}
              >
                Buy {coin}
              </Button>
              <Button variant="danger" size="lg" onClick={() => setPanel("sell")} disabled={!openPosition}>
                Sell {heldCoin ?? coin}
              </Button>
            </div>
            {openPosition && (
              <p className="mt-2.5 text-center text-[10px] text-text-tertiary">
                You hold {formatUsdt(openPosition.amount, { withSymbol: true })} in {heldCoin} · settles at{" "}
                <span className="mono-num font-bold text-text-secondary">
                  {formatUsdt(settleValue, { withSymbol: true })}
                </span>
              </p>
            )}
          </>
        )}

        {panel === "buy" && (
          <form onSubmit={handleBuy} className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-positive">Buy {coin}</p>
              <span className="rounded border border-border-strong bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold text-text-secondary">
                {lockupDays}-day plan
              </span>
            </div>

            <FormField label="Trade amount (USDT)" hint={`Deducted from your wallet balance. Min ${minAmount} USDT.`}>
              <input
                inputMode="decimal"
                autoFocus
                className={inputClass}
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder={String(minAmount)}
              />
            </FormField>

            {/* quick-size presets, exchange style */}
            <div className="grid grid-cols-4 gap-1.5">
              {[0.25, 0.5, 0.75, 1].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => applyPreset(f)}
                  className="rounded-lg border border-border-strong bg-surface-2 py-1.5 text-[11px] font-bold text-text-secondary transition-colors hover:border-brand/40 hover:text-brand active:translate-y-px"
                >
                  {f === 1 ? "MAX" : `${f * 100}%`}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2">
              <span className="text-[10px] text-text-tertiary">Wallet after trade</span>
              <span className="mono-num text-xs font-bold text-text-primary">
                {formatUsdt(Math.max(0, walletBalance - (Number.isNaN(parsedAmount) ? 0 : parsedAmount)), {
                  withSymbol: true
                })}
              </span>
            </div>

            <FormField label="Transaction key">
              <SecretInput required value={transactionKey} onChange={setTransactionKey} />
            </FormField>

            {error && <p className="text-xs font-medium text-negative">{error}</p>}

            <div className="flex gap-2">
              <Button type="submit" variant="success" size="lg" className="flex-1" disabled={loading}>
                {loading ? "Placing order…" : `Buy ${coin}`}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => {
                  setPanel("none");
                  setError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {panel === "sell" && openPosition && (
          <div className="space-y-3">
            <p className="text-sm font-bold text-negative">Sell {heldCoin}</p>
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border text-xs">
              <Row label="Staked" value={formatUsdt(openPosition.amount, { withSymbol: true })} />
              <Row
                label="Confirmed return"
                value={formatUsdt(openPosition.accrued, { withSymbol: true })}
                valueClass={openPosition.accrued > 0 ? "text-positive" : undefined}
              />
              <Row label="Credited to wallet" value={formatUsdt(settleValue, { withSymbol: true })} />
            </div>
            <p className="text-[10px] leading-relaxed text-text-tertiary">
              Closing settles the position into your Krypton wallet. Withdrawals to an external address are
              requested from the wallet afterwards.
            </p>

            {error && <p className="text-xs font-medium text-negative">{error}</p>}

            <div className="flex gap-2">
              <Button
                variant="danger"
                size="lg"
                className="flex-1"
                onClick={() => handleClosePosition(openPosition)}
                disabled={loading}
              >
                {loading ? "Closing…" : "Confirm close"}
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  setPanel("none");
                  setError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between bg-surface px-3 py-2.5">
      <span className="text-text-tertiary">{label}</span>
      <span className={`mono-num font-bold text-text-primary ${valueClass ?? ""}`}>{value}</span>
    </div>
  );
}
