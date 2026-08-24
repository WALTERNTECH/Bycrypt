"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdjustWalletForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const parsed = parseFloat(amount);
    if (Number.isNaN(parsed) || parsed === 0) {
      setError("Enter a non-zero amount (negative to debit).");
      return;
    }
    if (!reason.trim()) {
      setError("A reason is required — it's shown to the user.");
      return;
    }

    setLoading(true);
    const res = await fetch(`/api/users/${userId}/adjust-wallet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: parsed, reason: reason.trim() })
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Failed.");
      return;
    }
    setAmount("");
    setReason("");
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border/60 bg-panel p-4">
      <p className="text-sm font-semibold text-text-primary">Adjust wallet balance</p>
      <p className="mt-1 text-xs text-text-secondary">
        Manual reconciliation for this user specifically — not tied to any one deposit. Positive
        credits, negative debits. The reason is shown to the user.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <input
          type="number"
          step="0.000001"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount, e.g. 25 or -10"
          className="w-40 rounded-md border border-border bg-panel-2 px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-brand"
        />
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason"
          className="min-w-[200px] flex-1 rounded-md border border-border bg-panel-2 px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-brand"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-brand px-4 py-1.5 text-sm font-bold text-ink hover:bg-brand-hover disabled:opacity-50"
        >
          {loading ? "…" : "Apply"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-negative">{error}</p>}
      {saved && !error && <p className="mt-2 text-xs text-positive">Applied.</p>}
    </form>
  );
}
