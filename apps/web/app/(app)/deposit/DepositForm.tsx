"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { inputClass } from "@/components/FormField";
import { TelegramButton } from "@/components/TelegramButton";
import { Button } from "@/components/ui";
import { formatUsdt } from "@/lib/format";

const PLACEHOLDER_ADDRESS = "REPLACE_WITH_CLIENT_BTC_WALLET_ADDRESS";

interface Intent {
  deposit_id: string;
  address: string;
  expected_btc: number;
  amount_usd: number;
  rate_usd: number;
}

interface Outcome {
  status: "confirmed" | "pending_verification" | "rejected";
  message: string;
  btc_amount?: number;
  usd_amount?: number;
  confirmations?: number;
}

/**
 * Depositing, in three scrolling steps and one button.
 *
 * The transaction ID and the transaction key are both gone. Between them
 * they asked a depositor to go and find a 64-character hash in another
 * app, paste it without error, and then remember a second password — to
 * receive money they had already sent. Now: say how much, send the exact
 * amount shown, press Verify.
 *
 * The exact amount matters and the UI says so. It is the dollar figure at
 * the live rate with a few satoshis of tag on the end, and that tag is
 * what lets the platform find *this* payment on a shared address without
 * a transaction ID. Sending a rounded figure instead would leave the scan
 * with nothing to match.
 */
export function DepositForm({
  depositAddress,
  minDeposit,
  telegramUrl
}: {
  depositAddress: string;
  minDeposit: number;
  telegramUrl: string;
}) {
  const router = useRouter();

  const [amount, setAmount] = useState("");
  const [intent, setIntent] = useState<Intent | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [starting, setStarting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"address" | "amount" | null>(null);
  const [btcRate, setBtcRate] = useState<number | null>(null);
  const pollCount = useRef(0);
  const addressStep = useRef<HTMLDivElement>(null);

  const addressNotReady = !depositAddress || depositAddress === PLACEHOLDER_ADDRESS;
  const parsedAmount = parseFloat(amount);
  const amountValid = !Number.isNaN(parsedAmount) && parsedAmount >= minDeposit;

  // Derived from the minimum rather than hard-coded. A fixed $50 chip
  // under a $100 minimum just disabled Continue with no explanation.
  const quickAmounts = [minDeposit, minDeposit * 2, minDeposit * 5, minDeposit * 10].map((v) =>
    Math.round(v)
  );

  // The wallet is in dollars but the deposit arrives in BTC, so the dollar
  // figure has to be shown as an amount of BTC or the user has no way to
  // know what to send. Refreshed while they are on the page.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT");
        const json = await res.json();
        const price = Number(json?.price);
        if (!cancelled && Number.isFinite(price) && price > 0) setBtcRate(price);
      } catch {
        // Leave the estimate hidden rather than show a stale number.
      }
    }
    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // While a payment is on its way, keep checking without being asked.
  useEffect(() => {
    if (!intent || !outcome || outcome.status !== "pending_verification") return;
    if (pollCount.current >= 20) return;

    const timer = setTimeout(async () => {
      pollCount.current += 1;
      try {
        const res = await fetch(`/api/deposits/${intent.deposit_id}`);
        const data = await res.json();
        setOutcome(data);
        if (data.status === "confirmed") router.refresh();
      } catch {
        /* keep the last message and try again */
      }
    }, 10_000);

    return () => clearTimeout(timer);
  }, [intent, outcome, router]);

  async function startDeposit() {
    setError(null);
    if (!amountValid) {
      setError(`Enter an amount of ${formatUsdt(minDeposit, { withSymbol: true })} or more.`);
      return;
    }
    setStarting(true);
    try {
      const res = await fetch("/api/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_usd: parsedAmount })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not start that deposit.");
        return;
      }
      setIntent(data);
      setOutcome(null);
      pollCount.current = 0;
      requestAnimationFrame(() =>
        addressStep.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      );
    } finally {
      setStarting(false);
    }
  }

  async function verify() {
    if (!intent) return;
    setError(null);
    setVerifying(true);
    pollCount.current = 0;
    try {
      const res = await fetch(`/api/deposits/${intent.deposit_id}`, { method: "POST" });
      const data = await res.json();
      setOutcome(data);
      if (data.status === "confirmed") router.refresh();
    } catch {
      setError("Could not reach the network. Try Verify again in a moment.");
    } finally {
      setVerifying(false);
    }
  }

  async function copy(text: string, which: "address" | "amount") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard refused — the value is on screen to read */
    }
  }

  /* ---------- confirmed ---------- */

  if (outcome?.status === "confirmed") {
    return (
      <div className="rise-in pt-2 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-positive-dim">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            className="h-7 w-7 text-positive"
          >
            <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="mt-3.5 text-lg font-extrabold text-text-primary">Deposit confirmed</p>
        <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-text-secondary">
          {outcome.message}
        </p>
        <div className="mt-5 flex gap-2.5">
          <a
            href="/"
            className="flex h-11 flex-1 items-center justify-center rounded-lg bg-brand text-[14px] font-bold text-ink"
          >
            Back to wallet
          </a>
          <a
            href="/trade"
            className="flex h-11 flex-1 items-center justify-center rounded-lg bg-surface-3 text-[14px] font-bold text-text-primary"
          >
            Trade it
          </a>
        </div>
      </div>
    );
  }

  /* ---------- the scrolling flow ---------- */

  return (
    <div className="space-y-6 pb-4">
      {/* Step 1 — amount */}
      <section>
        <StepHeading n={1} title="How much do you want to fund?" />
        <p className="mt-1 text-[11px] text-text-tertiary">
          In US dollars. Minimum {formatUsdt(minDeposit, { withSymbol: true })}.
        </p>
        <div className="mt-2.5 flex items-center gap-2">
          <input
            inputMode="decimal"
            className={inputClass}
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value.replace(/[^0-9.]/g, ""));
              setIntent(null);
              setOutcome(null);
            }}
            placeholder={String(minDeposit)}
            aria-label="Deposit amount in USD"
            disabled={addressNotReady}
          />
        </div>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {quickAmounts.map((v) => (
            <button
              key={v}
              type="button"
              disabled={addressNotReady}
              onClick={() => {
                setAmount(String(v));
                setIntent(null);
                setOutcome(null);
              }}
              className="rounded-lg bg-surface-2 py-2 text-[12px] font-bold text-text-primary transition-colors hover:bg-surface-3 disabled:opacity-40"
            >
              ${v}
            </button>
          ))}
        </div>
        {btcRate && amountValid && !intent && (
          <p className="mt-2 text-[11px] text-text-tertiary">
            About{" "}
            <span className="mono-num font-bold text-text-secondary">
              {(parsedAmount / btcRate).toFixed(8)} BTC
            </span>{" "}
            at ${btcRate.toLocaleString(undefined, { maximumFractionDigits: 0 })}/BTC. The exact figure to
            send comes next.
          </p>
        )}

        {addressNotReady ? (
          <p className="mt-3 rounded-lg bg-negative-dim px-3 py-2.5 text-[11px] leading-relaxed text-negative">
            The platform&apos;s receiving Bitcoin address hasn&apos;t been configured yet. Deposits are
            disabled until an operator sets it in the admin dashboard.
          </p>
        ) : (
          !intent && (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              className="mt-3"
              onClick={startDeposit}
              disabled={starting || !amountValid}
            >
              {starting ? "Preparing…" : "Continue"}
            </Button>
          )
        )}
      </section>

      {/* Step 2 — send exactly this */}
      {intent && (
        <section ref={addressStep} className="rise-in scroll-mt-20">
          <StepHeading n={2} title="Send exactly this amount" />
          <p className="mt-1 text-[11px] leading-relaxed text-text-tertiary">
            Bitcoin network (BTC) only. The amount has to match to the last digit — that is how Krypton
            recognises your payment without you pasting a transaction ID.
          </p>

          <div className="mt-2.5 rounded-lg bg-brand-dim p-3.5">
            <p className="text-[11px] font-medium text-text-secondary">Amount to send</p>
            <div className="mt-1 flex items-center gap-2">
              <p className="mono-num min-w-0 flex-1 break-all text-[20px] font-bold leading-tight text-text-primary">
                {intent.expected_btc.toFixed(8)}
              </p>
              <span className="shrink-0 text-[13px] font-bold text-text-secondary">BTC</span>
              <button
                onClick={() => copy(intent.expected_btc.toFixed(8), "amount")}
                className="shrink-0 rounded-lg bg-brand px-3 py-1.5 text-[12px] font-bold text-ink"
              >
                {copied === "amount" ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-text-secondary">
              ≈ {formatUsdt(intent.amount_usd, { withSymbol: true })} at $
              {intent.rate_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}/BTC. Your wallet is
              credited at the rate when the payment confirms, so the final figure may differ slightly.
            </p>
          </div>

          <div className="mt-2.5">
            <p className="text-[11px] font-medium text-text-secondary">To this address</p>
            <div className="mt-1 flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2.5">
              <code className="mono-num min-w-0 flex-1 break-all text-[12px] text-text-primary">
                {intent.address}
              </code>
              <button
                onClick={() => copy(intent.address, "address")}
                className="shrink-0 rounded-lg bg-surface-3 px-3 py-1.5 text-[12px] font-bold text-text-primary"
              >
                {copied === "address" ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          <p className="mt-2 text-[11px] leading-relaxed text-text-tertiary">
            Funds sent on another network, or in another asset, cannot be recovered.
          </p>
        </section>
      )}

      {/* Step 3 — verify */}
      {intent && (
        <section className="rise-in">
          <StepHeading n={3} title="Verify your deposit" />
          <p className="mt-1 text-[11px] leading-relaxed text-text-tertiary">
            Once you&apos;ve sent it, press the button. Krypton checks the Bitcoin network for your
            payment and credits your wallet automatically — no transaction ID, nothing to paste.
          </p>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            className="mt-3"
            onClick={verify}
            disabled={verifying}
          >
            {verifying ? "Checking the network…" : "Verify Deposit"}
          </Button>

          {error && <p className="mt-2 text-[12px] font-medium text-negative">{error}</p>}

          {outcome && (
            <div
              className={`mt-3 rounded-lg p-3.5 ${
                outcome.status === "rejected" ? "bg-negative-dim" : "bg-surface-2"
              }`}
            >
              <div className="flex items-start gap-2.5">
                {outcome.status === "pending_verification" && (
                  <span className="mt-0.5 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                )}
                <div className="min-w-0">
                  <p
                    className={`text-[13px] font-bold ${
                      outcome.status === "rejected" ? "text-negative" : "text-text-primary"
                    }`}
                  >
                    {outcome.status === "rejected"
                      ? "Could not verify this deposit"
                      : outcome.confirmations !== undefined && outcome.confirmations >= 0 && outcome.btc_amount
                        ? "Payment found — waiting on the network"
                        : "Looking for your payment"}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">{outcome.message}</p>
                  {outcome.btc_amount !== undefined && (
                    <p className="mono-num mt-1 text-[11px] text-text-tertiary">
                      {outcome.btc_amount} BTC · {outcome.confirmations ?? 0} of 2 confirmations
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 rounded-lg bg-surface-2 p-3.5">
            <p className="text-[12px] font-bold text-text-primary">Don&apos;t have BTC yet?</p>
            <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">
              Buy Bitcoin on an exchange like Binance or OKX, withdraw it on the Bitcoin network to the
              address above, then come back and press Verify. Krypton Support can walk you through both
              steps on Telegram.
            </p>
            <div className="mt-2.5">
              <TelegramButton url={telegramUrl} variant="full" />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function StepHeading({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-3 text-[10px] font-bold text-text-primary">
        {n}
      </span>
      <h2 className="text-[13px] font-bold text-text-primary">{title}</h2>
    </div>
  );
}
