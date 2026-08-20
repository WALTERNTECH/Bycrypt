"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormField, inputClass, buttonClass } from "@/components/FormField";
import { isValidTronAddress } from "@/lib/tron-address";
import { formatUsdt } from "@/lib/format";

interface MaturedInvestment {
  id: string;
  amount: number;
  accrued_return: number;
  maturity_date: string;
  investment_tiers: { name: string } | null;
}

export function WithdrawForm({ investments }: { investments: MaturedInvestment[] }) {
  const router = useRouter();
  const [investmentId, setInvestmentId] = useState<string>(investments[0]?.id ?? "");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (investments.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-panel p-6 text-center text-sm text-text-secondary">
        You don't have any matured investments available to withdraw yet.
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValidTronAddress(address)) {
      setError("Enter a valid TRC20 (TRON) wallet address.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ investment_id: investmentId, destination_address: address.trim() })
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
        <p className="text-lg font-bold text-brand">Withdrawal requested</p>
        <p className="mt-2 text-sm text-text-secondary">
          An admin will review your request. You'll be notified once it's processed.
        </p>
      </div>
    );
  }

  const selected = investments.find((i) => i.id === investmentId);
  const total = selected ? parseFloat(String(selected.amount)) + parseFloat(String(selected.accrued_return)) : 0;

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border/60 bg-panel p-5 space-y-4">
      <FormField label="Matured investment">
        <select
          className={inputClass}
          value={investmentId}
          onChange={(e) => setInvestmentId(e.target.value)}
        >
          {investments.map((inv) => (
            <option key={inv.id} value={inv.id}>
              {inv.investment_tiers?.name ?? "Investment"} — {formatUsdt(inv.amount, { withSymbol: true })} principal
            </option>
          ))}
        </select>
      </FormField>

      {selected && (
        <p className="text-sm text-text-secondary">
          Total payout:{" "}
          <span className="mono-num font-semibold text-positive">{formatUsdt(total, { withSymbol: true })}</span>
          {" "}(principal + accrued return)
        </p>
      )}

      <FormField label="Destination TRC20 wallet address" hint="Funds are sent only to a TRON (TRC20) address you control.">
        <input
          required
          className={inputClass}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="T..."
        />
      </FormField>

      {error && <p className="text-sm text-negative">{error}</p>}

      <button type="submit" disabled={loading} className={buttonClass}>
        {loading ? "Submitting…" : "Request withdrawal"}
      </button>
    </form>
  );
}
