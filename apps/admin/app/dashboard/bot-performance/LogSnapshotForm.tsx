"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormField, inputClass, buttonClass } from "@/components/FormField";

export function LogSnapshotForm() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [logDate, setLogDate] = useState(today);
  const [pnl, setPnl] = useState("");
  const [liability, setLiability] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/bot-performance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        log_date: logDate,
        total_trading_pnl: parseFloat(pnl || "0"),
        total_accrued_liability: parseFloat(liability || "0"),
        notes: notes || null
      })
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to log snapshot.");
      return;
    }
    setPnl("");
    setLiability("");
    setNotes("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 rounded-xl border border-border/60 bg-panel p-5 sm:grid-cols-4">
      <FormField label="Date">
        <input type="date" required className={inputClass} value={logDate} onChange={(e) => setLogDate(e.target.value)} />
      </FormField>
      <FormField label="Trading P&L (USDT)">
        <input required type="number" step="0.000001" className={inputClass} value={pnl} onChange={(e) => setPnl(e.target.value)} />
      </FormField>
      <FormField label="Accrued liability (USDT)">
        <input
          required
          type="number"
          step="0.000001"
          className={inputClass}
          value={liability}
          onChange={(e) => setLiability(e.target.value)}
        />
      </FormField>
      <FormField label="Notes (optional)">
        <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </FormField>
      {error && <p className="sm:col-span-4 text-sm text-negative">{error}</p>}
      <div className="sm:col-span-4">
        <button type="submit" disabled={loading} className={buttonClass}>
          {loading ? "Logging…" : "Log snapshot"}
        </button>
      </div>
    </form>
  );
}
