"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FormField, inputClass, buttonClass } from "@/components/FormField";
import { SecretInput } from "@/components/SecretInput";
import { TelegramButton } from "@/components/TelegramButton";
import { isValidTxid } from "@/lib/btc-address";

const PLACEHOLDER_ADDRESS = "REPLACE_WITH_CLIENT_BTC_WALLET_ADDRESS";


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
  const network = "BTC";
  const [txHash, setTxHash] = useState("");
  const [transactionKey, setTransactionKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ deposit_id: string; status: string; message: string } | null>(null);
  const [btcRate, setBtcRate] = useState<number | null>(null);
  const pollCount = useRef(0);

  const addressNotReady = !depositAddress || depositAddress === PLACEHOLDER_ADDRESS;

  // The wallet is denominated in dollars but the deposit arrives in BTC,
  // so the dollar figure has to be shown as an amount of BTC, or the user
  // has no way to know what to send. Refreshed while they are on the page
  // because the rate moves.
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

  useEffect(() => {
    if (!result || result.status !== "pending_verification") return;
    if (pollCount.current >= 15) return;

    const timer = setTimeout(async () => {
      pollCount.current += 1;
      const res = await fetch(`/api/deposits/${result.deposit_id}`);
      const data = await res.json();
      setResult(data);
      if (data.status === "confirmed") router.refresh();
    }, 6000);

    return () => clearTimeout(timer);
  }, [result, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValidTxid(txHash)) {
      setError("That doesn't look like a valid Bitcoin transaction ID (64 hex characters).");
      return;
    }
    if (!transactionKey) {
      setError("Enter your transaction key.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tx_hash: txHash.trim(),
          transaction_key: transactionKey,
          network,
          claimed_amount: parseFloat(amount) || null
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong submitting your deposit.");
        return;
      }
      setResult(data);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    const confirmed = result.status === "confirmed";
    const rejected = result.status === "rejected";
    return (
      <div className="rounded-2xl border border-border bg-surface shadow-card p-6 text-center">
        {!confirmed && !rejected && (
          <div className="mb-3 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          </div>
        )}
        <p className={`text-lg font-bold ${confirmed ? "text-positive" : rejected ? "text-negative" : "text-brand"}`}>
          {confirmed ? "Deposit confirmed!" : rejected ? "Deposit could not be verified" : "Sent to Krypton Support for verification"}
        </p>
        <p className="mt-2 text-sm text-text-secondary">{result.message}</p>
        {confirmed ? (
          <a href="/" className="mt-5 inline-block text-sm font-semibold text-brand">
            Back to your wallet →
          </a>
        ) : rejected ? (
          <button
            onClick={() => {
              setResult(null);
              setTxHash("");
              pollCount.current = 0;
            }}
            className="mt-5 text-sm font-semibold text-brand"
          >
            Try a different transaction hash
          </button>
        ) : null}
      </div>
    );
  }

  const amountValid = parseFloat(amount) >= minDeposit;

  return (
    <div className="space-y-4">
      {/* Step 1 — amount */}
      <div className="rounded-2xl border border-border bg-surface shadow-card p-4">
        <p className="text-sm font-semibold text-text-primary">1. How much tradable capital?</p>
        <p className="mt-1 text-xs text-text-secondary">
          How much you want to fund, in US dollars. Minimum ${minDeposit}.
        </p>
        <div className="mt-3">
          <FormField label="Amount (USD)">
            <input
              inputMode="decimal"
              className={inputClass}
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder={String(minDeposit)}
            />
          </FormField>
          {btcRate && parseFloat(amount) > 0 && (
            <p className="mt-2 text-xs text-text-secondary">
              ≈ <span className="mono-num font-bold text-text-primary">
                {(parseFloat(amount) / btcRate).toFixed(8)} BTC
              </span>{" "}
              at ${btcRate.toLocaleString(undefined, { maximumFractionDigits: 0 })}/BTC. Your wallet is
              credited at the rate when your transaction confirms, so the final figure may differ slightly.
            </p>
          )}
        </div>
      </div>

      {/* Step 2 — address */}
      <div className="rounded-2xl border border-border bg-surface shadow-card p-4">
          <p className="text-sm font-semibold text-text-primary">2. Send BTC (Bitcoin Network)</p>
          <p className="mt-1 text-xs text-text-secondary">
            Send only BTC on the Bitcoin network to this address. Funds sent on another network, or in
            another asset, cannot be recovered.
          </p>

          <div className="mt-3 rounded-lg border border-border bg-surface shadow-card-2 px-3.5 py-3">
            <p className="text-xs font-semibold text-text-primary">Don't have BTC yet?</p>
            <p className="mt-1 text-xs leading-relaxed text-text-secondary">
              Buy Bitcoin on an exchange like Binance or OKX first, withdraw it on the Bitcoin network,
              then deposit it into your Krypton wallet using the address below. Krypton Support can
              walk you through both steps on Telegram if you're not sure how.
            </p>
            <div className="mt-2.5">
              <TelegramButton url={telegramUrl} variant="full" />
            </div>
          </div>

          {addressNotReady ? (
            <p className="mt-3 rounded-lg border border-negative/40 bg-negative/10 px-3 py-2 text-xs text-negative">
              The platform's receiving wallet address hasn't been configured yet. Deposits are
              disabled until an operator sets it in the admin dashboard.
            </p>
          ) : (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2.5">
              <code className="flex-1 truncate text-sm text-text-primary">{depositAddress}</code>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(depositAddress);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="shrink-0 rounded-lg border border-[#C9990A] bg-gradient-to-b from-brand-hover to-brand px-3 py-1.5 text-xs font-bold text-ink shadow-btn-brand transition-all duration-150 hover:from-[#FFD84D] hover:to-[#F7C21A] active:translate-y-px active:shadow-none"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          )}

        </div>

      {/* Step 3 — tx id + transaction key */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-surface shadow-card p-4">
          <p className="text-sm font-semibold text-text-primary">3. Verify your deposit</p>
          <p className="mt-1 text-xs text-text-secondary">
            We attempt on-chain verification automatically, and Krypton Support also confirms every
            deposit by hand — your wallet is credited as soon as either check clears.
          </p>
          <div className="mt-3 space-y-3">
            <FormField label="Transaction ID (txid)">
              <input
                required
                className={inputClass}
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="a1b2c3...d9"
              />
            </FormField>
            <FormField label="Transaction key" hint="The key you set at signup, required to authorize deposits.">
              <SecretInput required value={transactionKey} onChange={setTransactionKey} />
            </FormField>
          </div>
          {error && <p className="mt-2 text-sm text-negative">{error}</p>}
          <button type="submit" disabled={loading} className={`${buttonClass} mt-4 flex items-center justify-center gap-2`}>
            {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-base/40 border-t-base" />}
            {loading ? "Verifying…" : "Verify Deposit"}
          </button>
        </form>
    </div>
  );
}
