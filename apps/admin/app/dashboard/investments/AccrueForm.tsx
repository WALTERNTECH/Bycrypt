"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AccrueForm({
  investmentId,
  principal,
  maxReturnPct,
  currentAccrued
}: {
  investmentId: string;
  principal: number;
  maxReturnPct: number;
  currentAccrued: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState(currentAccrued.toFixed(2));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cap = (principal * maxReturnPct) / 100;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amount = parseFloat(value);
    if (Number.isNaN(amount) || amount < 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (amount > cap) {
      setError(`Cannot exceed the ${maxReturnPct}% cap (${cap.toFixed(2)} USDT).`);
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/investments/${investmentId}/accrue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accrued_return: amount })
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to update.");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
      <input
        type="number"
        step="0.000001"
        min={0}
        max={cap}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-24 rounded-md border border-border bg-panel-2 px-2 py-1 text-xs text-text-primary outline-none focus:border-brand"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-brand px-2 py-1 text-xs font-bold text-base hover:bg-brand-hover disabled:opacity-50"
      >
        {loading ? "…" : "Save"}
      </button>
      {error && <span className="text-xs text-negative">{error}</span>}
    </form>
  );
}
