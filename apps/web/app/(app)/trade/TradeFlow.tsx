"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormField, inputClass, buttonClass } from "@/components/FormField";
import { formatUsdt } from "@/lib/format";
import type { Tier } from "@/components/TierCard";

export function TradeFlow({
  tiers,
  walletBalance,
  minAmount
}: {
  tiers: Tier[];
  walletBalance: number;
  minAmount: number;
}) {
  const router = useRouter();
  const [tierId, setTierId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [transactionKey, setTransactionKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ traded_symbol: string | null } | null>(null);

  const selectedTier = tiers.find((t) => t.id === tierId);
  const parsedAmount = parseFloat(amount);
  const amountValid = !Number.isNaN(parsedAmount) && parsedAmount >= minAmount && parsedAmount <= walletBalance;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!tierId) return;
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
        body: JSON.stringify({ tier_id: tierId, amount: parsedAmount, transaction_key: transactionKey })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setResult(data);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="rounded-xl border border-border/60 bg-panel p-6 text-center">
        <p className="text-lg font-bold text-positive">Trade placed!</p>
        <p className="mt-2 text-sm text-text-secondary">
          {formatUsdt(parsedAmount, { withSymbol: true })} allocated to a {selectedTier?.lockup_days}-day plan.
          {result.traded_symbol && (
            <>
              {" "}
              The bot's currently trading it in <span className="font-semibold text-text-primary">{result.traded_symbol.replace("USDT", "")}</span>.
            </>
          )}
        </p>
        <a href="/investments" className="mt-5 inline-block text-sm font-semibold text-brand">
          View your investments →
        </a>
      </div>
    );
  }

  if (walletBalance < minAmount) {
    return (
      <div className="rounded-xl border border-border/60 bg-panel p-6 text-center">
        <p className="text-sm font-bold text-text-primary">Your wallet balance is too low</p>
        <p className="mt-2 text-xs text-text-secondary">
          Available: {formatUsdt(walletBalance, { withSymbol: true })}. Deposit at least {minAmount} USDT
          before trading.
        </p>
        <Link href="/deposit" className="mt-4 inline-block rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-base hover:bg-brand-hover">
          Deposit
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-panel p-4">
        <p className="text-xs font-medium text-text-secondary">Available to trade</p>
        <p className="mono-num mt-1 text-2xl font-extrabold text-text-primary">
          {formatUsdt(walletBalance, { withSymbol: true })}
        </p>
      </div>

      <div className="rounded-xl border border-border/60 bg-panel p-4">
        <p className="text-sm font-semibold text-text-primary">Choose a plan</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {tiers.map((t) => (
            <button
              key={t.id}
              onClick={() => setTierId(t.id)}
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

      {selectedTier && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-border/60 bg-panel p-4">
          <p className="text-sm font-semibold text-text-primary">
            {selectedTier.lockup_days}-day plan · up to {selectedTier.max_return_pct}%
          </p>
          <div className="mt-3 space-y-3">
            <FormField label="Amount (USDT)" hint={`Between ${minAmount} and ${formatUsdt(walletBalance)} available.`}>
              <input
                inputMode="decimal"
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
          </div>
          {error && <p className="mt-2 text-sm text-negative">{error}</p>}
          <button type="submit" disabled={loading} className={`${buttonClass} mt-4`}>
            {loading ? "Placing trade…" : "Buy"}
          </button>
        </form>
      )}
    </div>
  );
}
