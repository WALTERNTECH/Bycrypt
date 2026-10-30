"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CandleChart } from "@/components/CandleChart";
import { useLiveTickers } from "@/hooks/useLiveTickers";
import { usePositionState } from "@/hooks/usePositionState";
import { inputClass } from "@/components/FormField";
import { Button, ButtonLink } from "@/components/ui";
import { formatUsdt, formatPct } from "@/lib/format";
import { CHART_INTERVALS, INTERVAL_LABEL, SCAN_WINDOW, type ChartInterval } from "@/lib/market";
import { TARGET_GAIN_OPTIONS, type OpenPositionRow } from "@/lib/position";
import { coinMoveForTarget } from "@/lib/leverage";
import { scanMarket, type MarketScan } from "@/lib/scan";

interface Fill {
  side: "BUY" | "SELL";
  symbol: string;
  amount: number;
  timeframe: string;
  target: number;
  entry: number | null;
  time: string;
}

/**
 * The order flow, in the order the questions are actually asked:
 *
 *   1. Which timeframe am I trading?    → sets the chart and the scan window
 *   2. How much am I staking?           → dollars out of the wallet
 *   3. What return closes it for me?    → the auto-close target
 *   4. Which way does the market say?   → the scan, run on the timeframe above
 *
 * Step 3 used to be a row of 25/50/75/MAX chips sitting under the amount
 * field, which read as "a percentage of my wallet" rather than "a
 * percentage return". Both questions exist now and each is labelled with
 * the one it is asking.
 *
 * Step 4 is a scan, not a forecast. It reports which way the market has
 * moved over the window the chip names, and the server re-runs the same
 * scan when the order lands — so the side recorded on the position is the
 * platform's own signal, never a value posted by the browser.
 */
export function TradeChartClient({
  symbol,
  displayName,
  walletBalance,
  tierId,
  minAmount,
  openPosition
}: {
  symbol: string;
  displayName: string;
  walletBalance: number;
  tierId: number | null;
  minAmount: number;
  openPosition: OpenPositionRow | null;
}) {
  const router = useRouter();
  const [timeframe, setTimeframe] = useState<ChartInterval>("1d");
  const { tickers } = useLiveTickers([symbol]);
  const t = tickers[symbol];
  const up = (t?.priceChangePercent ?? 0) >= 0;
  const coin = symbol.replace("USDT", "");

  const [amount, setAmount] = useState("");
  const [target, setTarget] = useState<number | null>(null);
  const [scan, setScan] = useState<MarketScan | null>(null);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fill, setFill] = useState<Fill | null>(null);

  const parsedAmount = parseFloat(amount);
  const amountValid =
    !Number.isNaN(parsedAmount) && parsedAmount >= minAmount && parsedAmount <= walletBalance;
  const positionElsewhere = openPosition && openPosition.symbol !== symbol ? openPosition : null;
  const readyToScan = amountValid && target !== null && !openPosition;

  /* ---------- the scan ---------- */

  const runScan = useCallback(async () => {
    setScanning(true);
    const result = await scanMarket(symbol, timeframe);
    setScan(result);
    setScanning(false);
  }, [symbol, timeframe]);

  // Re-reads the market whenever the inputs that define the read change,
  // and keeps it fresh while the ticket sits open — a signal from twenty
  // minutes ago is not a signal.
  useEffect(() => {
    if (!readyToScan) {
      setScan(null);
      return;
    }
    runScan();
    const id = setInterval(runScan, 45_000);
    return () => clearInterval(id);
  }, [readyToScan, runScan]);

  /* ---------- actions ---------- */

  async function placeOrder() {
    setError(null);
    if (!tierId) return setError("No trading plan is available right now.");
    if (!amountValid) {
      return setError(`Enter an amount between ${minAmount} and ${formatUsdt(walletBalance)} USD.`);
    }
    if (target === null) return setError("Choose the return that closes this position.");

    setLoading(true);
    try {
      const res = await fetch("/api/investments/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier_id: tierId,
          amount: parsedAmount,
          symbol,
          timeframe,
          target_gain_pct: target
        })
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "Order could not be placed.");
      setFill({
        side: data.side === "SELL" ? "SELL" : "BUY",
        symbol,
        amount: parsedAmount,
        timeframe: INTERVAL_LABEL[timeframe],
        target,
        entry: typeof data.entry_price === "number" ? data.entry_price : null,
        time: new Date().toLocaleString()
      });
      setAmount("");
      setTarget(null);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function closePosition(position: OpenPositionRow) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/investments/${position.id}/cashout`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "Could not close this position.");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  /* ---------- fill ticket ---------- */

  if (fill) {
    const isBuy = fill.side === "BUY";
    return (
      <div className="rise-in pt-2">
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
            isBuy ? "bg-positive-dim" : "bg-negative-dim"
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
        <p className="mt-3.5 text-center text-lg font-extrabold text-text-primary">Position open</p>
        <p className="mx-auto mt-1 max-w-xs text-center text-xs leading-relaxed text-text-secondary">
          Krypton read the {fill.timeframe} market and opened a {fill.side.toLowerCase()}. It closes itself
          at +{fill.target}%, or whenever you close it.
        </p>

        <div className="mt-5 overflow-hidden rounded-lg bg-surface-2">
          <Row label="Market" value={fill.symbol.replace("USDT", "/USDT")} />
          <Row label="Signal" value={fill.side} valueClass={isBuy ? "text-positive" : "text-negative"} />
          <Row label="Timeframe" value={fill.timeframe} />
          <Row label="Staked" value={formatUsdt(fill.amount, { withSymbol: true })} />
          <Row label="Closes at" value={`+${fill.target}%`} />
          {fill.entry !== null && (
            <Row
              label="Entry price"
              value={fill.entry.toLocaleString(undefined, { maximumFractionDigits: fill.entry >= 100 ? 2 : 6 })}
            />
          )}
          <Row label="Opened" value={fill.time} />
        </div>

        <div className="mt-5 flex gap-2.5">
          <ButtonLink href="/" variant="primary" size="lg" className="flex-1">
            View position
          </ButtonLink>
          <Button variant="secondary" size="lg" onClick={() => setFill(null)}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  /* ---------- chart + staged order flow ---------- */

  return (
    <div>
      <Link
        href="/trade"
        className="inline-flex items-center gap-1 text-xs font-bold text-text-secondary transition-colors hover:text-text-primary"
      >
        <span aria-hidden>&larr;</span> Markets
      </Link>

      <div className="mt-2.5 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-[10px] font-bold text-text-secondary">
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
                up ? "bg-positive-dim text-positive" : "bg-negative-dim text-negative"
              }`}
            >
              {t ? formatPct(t.priceChangePercent, { signed: true }) : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Step 1 — timeframe. Sets the chart and the window the scan reads. */}
      <div className="mt-3.5 flex gap-1 rounded-lg bg-surface-2 p-1">
        {CHART_INTERVALS.map((iv) => (
          <button
            key={iv}
            onClick={() => setTimeframe(iv)}
            className={`flex-1 rounded-md py-1.5 text-[12px] font-bold transition-colors ${
              timeframe === iv
                ? "bg-base text-text-primary shadow-card"
                : "text-text-tertiary hover:text-text-primary"
            }`}
          >
            {INTERVAL_LABEL[iv]}
          </button>
        ))}
      </div>

      <div className="mt-2.5 overflow-hidden rounded-lg">
        <CandleChart symbol={symbol} interval={timeframe} />
      </div>

      {/* Holding a different coin: offer the exit rather than a dead end */}
      {positionElsewhere && (
        <PositionElsewhere
          position={positionElsewhere}
          coin={coin}
          loading={loading}
          onClose={() => closePosition(positionElsewhere)}
        />
      )}

      {openPosition && !positionElsewhere && (
        <SamePositionOpen position={openPosition} loading={loading} onClose={() => closePosition(openPosition)} />
      )}

      {!openPosition && (
        <div className="mt-5 space-y-5">
          {/* Step 2 — stake */}
          <div>
            <StepLabel n={2}>How much are you staking?</StepLabel>
            <p className="mt-1 text-[11px] text-text-tertiary">
              Taken from your wallet. Minimum {formatUsdt(minAmount, { withSymbol: true })}, available{" "}
              <span className="mono-num font-semibold text-text-secondary">
                {formatUsdt(walletBalance, { withSymbol: true })}
              </span>
              .
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <input
                inputMode="decimal"
                className={inputClass}
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder={String(minAmount)}
                aria-label="Stake amount in USD"
              />
              <button
                type="button"
                onClick={() => setAmount(walletBalance > 0 ? walletBalance.toFixed(2) : "")}
                className="h-11 shrink-0 rounded-lg bg-surface-3 px-3.5 text-[12px] font-bold text-text-primary transition-colors hover:bg-[#E4E5EA]"
              >
                All
              </button>
            </div>
            {amount && !amountValid && (
              <p className="mt-1.5 text-[11px] font-medium text-negative">
                {parsedAmount > walletBalance
                  ? "That is more than your wallet holds."
                  : `Minimum stake is ${formatUsdt(minAmount, { withSymbol: true })}.`}
              </p>
            )}
          </div>

          {/* Step 3 — the return that closes it */}
          <div>
            <StepLabel n={3}>What return closes it automatically?</StepLabel>
            <p className="mt-1 text-[11px] text-text-tertiary">
              The position settles itself the moment it reaches this gain. These are returns on your
              stake — not how much of your wallet to use.
            </p>
            <div className="mt-2.5 grid grid-cols-4 gap-2">
              {TARGET_GAIN_OPTIONS.map((pct) => {
                const active = target === pct;
                return (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setTarget(pct)}
                    className={`rounded-lg py-2.5 transition-colors ${
                      active ? "bg-brand text-ink" : "bg-surface-2 text-text-primary hover:bg-surface-3"
                    }`}
                  >
                    <span className="mono-num block text-[14px] font-bold leading-none">+{pct}%</span>
                    <span
                      className={`mono-num mt-1 block text-[9px] leading-none ${
                        active ? "text-ink/70" : "text-text-tertiary"
                      }`}
                    >
                      {amountValid ? formatUsdt((parsedAmount * pct) / 100, { withSymbol: true }) : `${coinMoveForTarget(pct)}% move`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 4 — the scan */}
          <div>
            <StepLabel n={4}>Krypton&apos;s read on this market</StepLabel>
            {!readyToScan ? (
              <p className="mt-2 rounded-lg bg-surface-2 px-3.5 py-4 text-[12px] text-text-tertiary">
                Set a stake and a target return, and Krypton scans{" "}
                {SCAN_WINDOW[timeframe].label} of {coin} to tell you which way to hold.
              </p>
            ) : scanning && !scan ? (
              <p className="mt-2 flex items-center gap-2 rounded-lg bg-surface-2 px-3.5 py-4 text-[12px] text-text-secondary">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                Scanning {SCAN_WINDOW[timeframe].label} of {coin}…
              </p>
            ) : scan ? (
              <SignalCard scan={scan} coin={coin} timeframeLabel={INTERVAL_LABEL[timeframe]} />
            ) : (
              <div className="mt-2 rounded-lg bg-surface-2 px-3.5 py-4">
                <p className="text-[12px] text-text-secondary">
                  The market feed could not be read just now, so there is no signal to give.
                </p>
                <button onClick={runScan} className="mt-2 text-[12px] font-bold text-brand">
                  Scan again
                </button>
              </div>
            )}
          </div>

          {error && <p className="text-xs font-medium text-negative">{error}</p>}

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={placeOrder}
            disabled={loading || !readyToScan || !scan}
          >
            {loading
              ? "Opening position…"
              : scan
                ? `Hold ${scan.side} ${coin} · ${formatUsdt(parsedAmount || 0, { withSymbol: true })}`
                : "Hold position"}
          </Button>
          <p className="-mt-3 text-center text-[10px] leading-relaxed text-text-tertiary">
            The signal is re-read when you confirm, so the position opens on the direction the market is
            showing at that moment.
          </p>
        </div>
      )}
    </div>
  );
}

/* ---------- pieces ---------- */

function StepLabel({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-3 text-[10px] font-bold text-text-primary">
        {n}
      </span>
      <h3 className="text-[13px] font-bold text-text-primary">{children}</h3>
    </div>
  );
}

function SignalCard({
  scan,
  coin,
  timeframeLabel
}: {
  scan: MarketScan;
  coin: string;
  timeframeLabel: string;
}) {
  const isBuy = scan.side === "BUY";
  const moved = scan.changePct >= 0;
  return (
    <div className={`mt-2 rounded-lg p-3.5 ${isBuy ? "bg-positive-dim" : "bg-negative-dim"}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={`text-[20px] font-extrabold leading-none ${isBuy ? "text-positive" : "text-negative"}`}>
            {scan.side}
          </p>
          <p className="mt-1 text-[11px] font-medium text-text-secondary">
            <span className="capitalize">{scan.strength}</span> signal · {scan.agreement} of 3 reads agree
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-text-tertiary">{timeframeLabel} window</p>
          <p className={`mono-num text-[15px] font-bold ${moved ? "text-positive" : "text-negative"}`}>
            {formatPct(scan.changePct, { signed: true })}
          </p>
        </div>
      </div>
      <p className="mt-2.5 text-[11px] leading-relaxed text-text-secondary">
        {coin} is {moved ? "up" : "down"} {Math.abs(scan.changePct).toFixed(2)}% over the last {scan.window},{" "}
        {(scan.upShare * 100).toFixed(0)}% of candles closed up, and price sits{" "}
        {formatPct(scan.vsMean, { signed: true })} against the period average. That reads{" "}
        {isBuy ? "upward" : "downward"}, so the position is held {scan.side === "BUY" ? "long" : "short"}.
      </p>
    </div>
  );
}

function PositionElsewhere({
  position,
  coin,
  loading,
  onClose
}: {
  position: OpenPositionRow;
  coin: string;
  loading: boolean;
  onClose: () => void;
}) {
  const { state } = usePositionState(position);
  const held = position.symbol?.replace("USDT", "") ?? "your";
  return (
    <div className="mt-4 rounded-lg bg-brand-dim p-3.5">
      <p className="text-[13px] font-bold text-text-primary">{held} position is open</p>
      <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">
        Krypton runs one position at a time. Closing it releases{" "}
        <span className="mono-num font-bold text-text-primary">
          {formatUsdt(state.settles, { withSymbol: true })}
        </span>{" "}
        back to your wallet, and then you can trade {coin}.
      </p>
      <Button variant="primary" size="md" fullWidth className="mt-3" onClick={onClose} disabled={loading}>
        {loading ? "Closing…" : `Close ${held} position`}
      </Button>
    </div>
  );
}

function SamePositionOpen({
  position,
  loading,
  onClose
}: {
  position: OpenPositionRow;
  loading: boolean;
  onClose: () => void;
}) {
  const { state } = usePositionState(position);
  const up = state.pnl >= 0;
  return (
    <div className="mt-4 rounded-lg bg-surface-2 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-bold text-text-primary">
            {position.side === "SELL" ? "Sell" : "Buy"} position open
          </p>
          <p className="mt-1 text-[11px] text-text-secondary">
            Staked{" "}
            <span className="mono-num font-semibold text-text-primary">
              {formatUsdt(position.principal, { withSymbol: true })}
            </span>
            {position.targetGainPct !== null && <> · closes at +{position.targetGainPct}%</>}
          </p>
        </div>
        <div className="text-right">
          <p className={`mono-num text-[17px] font-bold leading-none ${up ? "text-positive" : "text-negative"}`}>
            {formatPct(state.pnlPct, { signed: true })}
          </p>
          <p className="mono-num mt-1 text-[11px] text-text-secondary">
            {formatUsdt(state.settles, { withSymbol: true })}
          </p>
        </div>
      </div>
      <Button variant="primary" size="md" fullWidth className="mt-3" onClick={onClose} disabled={loading}>
        {loading ? "Closing…" : "Close position"}
      </Button>
    </div>
  );
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between px-3.5 py-2.5 text-xs">
      <span className="text-text-tertiary">{label}</span>
      <span className={`mono-num font-bold text-text-primary ${valueClass ?? ""}`}>{value}</span>
    </div>
  );
}
