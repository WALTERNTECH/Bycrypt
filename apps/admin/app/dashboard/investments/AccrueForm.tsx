"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Growth is uncapped (minimum 40%, no maximum) — admin calculates the
// coin's actual move and enters it here as either a percentage (amount
// auto-computes) or a direct USDT amount (percentage auto-computes).
export function AccrueForm({
  investmentId,
  principal,
  minReturnPct,
  currentAccrued
}: {
  investmentId: string;
  principal: number;
  minReturnPct: number | null;
  currentAccrued: number;
}) {
  const router = useRouter();
  const initialPct = principal > 0 ? (currentAccrued / principal) * 100 : 0;
  const [pct, setPct] = useState(initialPct.toFixed(2));
  const [amount, setAmount] = useState(currentAccrued.toFixed(2));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function onPctChange(v: string) {
    setPct(v);
    const p = parseFloat(v);
    if (!Number.isNaN(p) && principal > 0) setAmount(((principal * p) / 100).toFixed(6));
  }

  function onAmountChange(v: string) {
    setAmount(v);
    const a = parseFloat(v);
    if (!Number.isNaN(a) && principal > 0) setPct(((a / principal) * 100).toFixed(2));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const parsedAmount = parseFloat(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
      setError("Enter a valid amount.");
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/investments/${investmentId}/accrue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accrued_return: parsedAmount })
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to update.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1">
          <input
            type="number"
            step="0.01"
            value={pct}
            onChange={(e) => onPctChange(e.target.value)}
            className="w-16 rounded-md border border-border bg-panel-2 px-1.5 py-1 text-xs text-text-primary outline-none focus:border-brand"
          />
          <span className="text-xs text-text-secondary">%</span>
        </div>
        <span className="text-xs text-text-secondary">=</span>
        <input
          type="number"
          step="0.000001"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          className="w-24 rounded-md border border-border bg-panel-2 px-1.5 py-1 text-xs text-text-primary outline-none focus:border-brand"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-brand px-2 py-1 text-xs font-bold text-base hover:bg-brand-hover disabled:opacity-50"
        >
          {loading ? "…" : "Save"}
        </button>
      </div>
      {minReturnPct != null && <p className="text-[10px] text-text-secondary">Floor: {minReturnPct}%, no cap</p>}
      {error && <span className="text-xs text-negative">{error}</span>}
      {saved && !error && <span className="text-xs text-positive">Saved</span>}
    </form>
  );
}
