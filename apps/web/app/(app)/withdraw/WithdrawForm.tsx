"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormField, inputClass, buttonClass } from "@/components/FormField";
import { isValidTronAddress } from "@/lib/tron-address";
import { formatUsdt } from "@/lib/format";

export function WithdrawForm({ walletBalance }: { walletBalance: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [transactionKey, setTransactionKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (walletBalance <= 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-panel p-6 text-center text-xs text-text-secondary">
        Your wallet balance is empty. Deposit funds or cash out a profitable investment first.
        <div className="mt-3">
          <Link href="/deposit" className="text-sm font-semibold text-brand">
            Go to Deposit →
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > walletBalance) {
      setError(`Enter an amount between 0 and ${formatUsdt(walletBalance)} USDT.`);
      return;
    }
    if (!isValidTronAddress(address)) {
      setError("Enter a valid TRC20 (TRON) wallet address.");
      return;
    }
    if (!transactionKey) {
      setError("Enter your transaction key.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: parsedAmount,
        destination_address: address.trim(),
        transaction_key: transactionKey
      })
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong submitting your request.");
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  if (success) {
    return (
      <div className="rounded-xl border border-border/60 bg-panel p-6 text-center">
        <p className="text-base font-bold text-brand">Withdrawal requested</p>
        <p className="mt-2 text-xs text-text-secondary">
          Krypton Support will review and send your funds. You'll be notified once it's processed.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border/60 bg-panel p-4 space-y-3">
      <p className="text-xs text-text-secondary">
        Available: <span className="mono-num font-semibold text-text-primary">{formatUsdt(walletBalance, { withSymbol: true })}</span>
      </p>

      <FormField label="Amount (USDT)">
        <input
          inputMode="decimal"
          className={inputClass}
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder={String(walletBalance)}
        />
      </FormField>

      <FormField label="Destination TRC20 wallet address" hint="Funds are sent only to a TRON (TRC20) address you control.">
        <input
          required
          className={inputClass}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="T..."
        />
      </FormField>

      <FormField label="Transaction key" hint="The key you set at signup, required to authorize withdrawals.">
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

      <button type="submit" disabled={loading} className={buttonClass}>
        {loading ? "Submitting…" : "Request withdrawal"}
      </button>
    </form>
  );
}
