"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ManualCreditForm({ depositId, suggestedAmount }: { depositId: string; suggestedAmount: number | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(suggestedAmount ? String(suggestedAmount) : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    const parsed = parseFloat(amount);
    if (Number.isNaN(parsed) || parsed <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/deposits/${depositId}/credit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: parsed })
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Failed.");
      return;
    }
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-positive/10 px-2.5 py-1 text-xs font-semibold text-positive hover:bg-positive/20"
      >
        Credit manually
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        step="0.000001"
        min={0}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount"
        className="w-24 rounded-md border border-border bg-panel-2 px-2 py-1 text-xs text-text-primary outline-none focus:border-brand"
      />
      <button
        disabled={loading}
        onClick={handleConfirm}
        className="rounded-md bg-positive/10 px-2 py-1 text-xs font-bold text-positive hover:bg-positive/20 disabled:opacity-50"
      >
        {loading ? "…" : "Confirm"}
      </button>
      <button onClick={() => setOpen(false)} className="text-xs text-text-secondary">
        Cancel
      </button>
      {error && <span className="text-xs text-negative">{error}</span>}
    </div>
  );
}
