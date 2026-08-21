"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FormField, inputClass, buttonClass } from "@/components/FormField";
import { TelegramButton } from "@/components/TelegramButton";
import { isValidTxHash } from "@/lib/tron-address";
import type { Tier } from "@/components/TierCard";

const PLACEHOLDER_ADDRESS = "REPLACE_WITH_CLIENT_TRC20_WALLET_ADDRESS";

export function DepositForm({
  tiers,
  depositAddress,
  minDeposit,
  telegramUrl,
  preselectedTier
}: {
  tiers: Tier[];
  depositAddress: string;
  minDeposit: number;
  telegramUrl: string;
  preselectedTier?: number | null;
}) {
  const router = useRouter();
  const initialTierValid = preselectedTier && tiers.some((t) => t.id === preselectedTier);
  const [step, setStep] = useState<1 | 2 | 3>(initialTierValid ? 2 : 1);
  const [tierId, setTierId] = useState<number | null>(initialTierValid ? preselectedTier! : null);
  const [txHash, setTxHash] = useState("");
  const [transactionKey, setTransactionKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ deposit_id: string; status: string; message: string } | null>(null);
  const pollCount = useRef(0);

  const selectedTier = tiers.find((t) => t.id === tierId);
  const addressNotReady = !depositAddress || depositAddress === PLACEHOLDER_ADDRESS;

  // Poll for a final status while verification is still pending.
  useEffect(() => {
    if (!result || result.status !== "pending_verification") return;
    if (pollCount.current >= 15) return; // ~90s of polling, then user can refresh manually

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

    if (!isValidTxHash(txHash)) {
      setError("That doesn't look like a valid transaction hash (64 hex characters).");
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
        body: JSON.stringify({ tier_id: tierId, tx_hash: txHash.trim(), transaction_key: transactionKey })
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
      <div className="rounded-xl border border-border/60 bg-panel p-6 text-center">
        <p className={`text-lg font-bold ${confirmed ? "text-positive" : rejected ? "text-negative" : "text-brand"}`}>
          {confirmed ? "Deposit confirmed!" : rejected ? "Deposit could not be verified" : "Verifying on-chain…"}
        </p>
        <p className="mt-2 text-sm text-text-secondary">{result.message}</p>
        {confirmed ? (
          <a href="/investments" className="mt-5 inline-block text-sm font-semibold text-brand">
            View your investments →
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
        ) : (
          <div className="mt-4 flex justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Step 1 — tier */}
      <div className="rounded-xl border border-border/60 bg-panel p-4">
        <p className="text-sm font-semibold text-text-primary">1. Choose your lockup tier</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {tiers.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTierId(t.id);
                setStep(2);
              }}
              className={`rounded-lg border px-3 py-3 text-center transition-colors ${
                tierId === t.id ? "border-brand bg-brand/10" : "border-border/60 hover:border-border"
              }`}
            >
              <p className="text-sm font-bold text-text-primary">{t.lockup_days}d</p>
              <p className="mono-num text-xs text-positive">Up to {t.max_return_pct}%</p>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2 — address */}
      {step >= 2 && selectedTier && (
        <div className="rounded-xl border border-border/60 bg-panel p-4">
          <p className="text-sm font-semibold text-text-primary">2. Send USDT (TRC20 / TRON network)</p>
          <p className="mt-1 text-xs text-text-secondary">
            Minimum deposit: {minDeposit} USDT. Send only USDT on the TRON (TRC20) network to this
            address — other networks or assets cannot be recovered.
          </p>

          <div className="mt-3 rounded-lg border border-border/60 bg-panel-2 px-3.5 py-3">
            <p className="text-xs font-semibold text-text-primary">Don't have USDT yet?</p>
            <p className="mt-1 text-xs leading-relaxed text-text-secondary">
              Buy USDT on an exchange like Binance or OKX first, withdraw it on the TRC20 (TRON)
              network, then send it to the address below. If you're not sure how, Krypton Support
              will walk you through it on Telegram.
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
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-panel-2 px-3 py-2.5">
              <code className="flex-1 truncate text-sm text-text-primary">{depositAddress}</code>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(depositAddress);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="shrink-0 rounded-md bg-brand px-2.5 py-1 text-xs font-bold text-base hover:bg-brand-hover"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          )}

          <button
            onClick={() => setStep(3)}
            disabled={addressNotReady}
            className="mt-4 text-sm font-semibold text-brand disabled:opacity-50"
          >
            I've sent the funds →
          </button>
        </div>
      )}

      {/* Step 3 — tx hash + transaction key */}
      {step >= 3 && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-border/60 bg-panel p-4">
          <p className="text-sm font-semibold text-text-primary">3. Confirm your deposit</p>
          <p className="mt-1 text-xs text-text-secondary">
            We'll verify your transaction on-chain automatically — this usually takes under a
            minute.
          </p>
          <div className="mt-3 space-y-3">
            <FormField label="Transaction hash">
              <input
                required
                className={inputClass}
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="a1b2c3...d9"
              />
            </FormField>
            <FormField label="Transaction key" hint="The key you set at signup, required to authorize deposits.">
              <input
                required
                type="password"
                className={inputClass}
                value={transactionKey}
                onChange={(e) => setTransactionKey(e.target.value)}
                placeholder="Your transaction key"
              />
            </FormField>
          </div>
          {error && <p className="mt-2 text-sm text-negative">{error}</p>}
          <button type="submit" disabled={loading} className={`${buttonClass} mt-4`}>
            {loading ? "Verifying…" : "Submit for verification"}
          </button>
        </form>
      )}
    </div>
  );
}
