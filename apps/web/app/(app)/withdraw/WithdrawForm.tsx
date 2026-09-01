"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormField, inputClass, buttonClass } from "@/components/FormField";
import { SecretInput } from "@/components/SecretInput";
import { TelegramButton } from "@/components/TelegramButton";
import { isValidTronAddress } from "@/lib/tron-address";
import { formatUsdt } from "@/lib/format";

export function WithdrawForm({ walletBalance, telegramUrl }: { walletBalance: number; telegramUrl: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [transactionKey, setTransactionKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (walletBalance <= 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface shadow-card p-6 text-center text-xs text-text-secondary">
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
      <div className="rounded-2xl border border-border bg-surface shadow-card p-6 text-center">
        <div className="mb-3 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
        <p className="text-base font-bold text-brand">Withdrawal request is being processed</p>
        <p className="mt-2 text-xs text-text-secondary">
          Krypton Support reviews every request by hand. You'll see the outcome right here on your
          dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-surface shadow-card p-4 space-y-3">
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
          <SecretInput required value={transactionKey} onChange={setTransactionKey} />
        </FormField>

        {error && <p className="text-sm text-negative">{error}</p>}

        <button type="submit" disabled={loading} className={buttonClass}>
          {loading ? "Submitting…" : "Request withdrawal"}
        </button>
      </form>

      <div className="rounded-2xl border border-border bg-surface shadow-card-2 px-3.5 py-3">
        <p className="text-xs text-text-secondary">Not sure about the process, or your funds haven't arrived?</p>
        <div className="mt-2">
          <TelegramButton url={telegramUrl} variant="full" label="Guide me on my withdrawal" />
        </div>
      </div>
    </div>
  );
}
