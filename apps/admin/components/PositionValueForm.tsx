"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Manual control over an open position's floating value.
 *
 * Support thinks in three different units depending on the situation —
 * "it's worth $780 now", "they're up $280", "they're up 40%" — so all
 * three inputs are live and stay in sync off the principal. Whichever
 * one is typed, the other two recompute, and only the profit figure
 * (accrued_return) is ever persisted.
 *
 * This moves the *trading* balance, never the wallet. Wallet moves are
 * a separate tool, because conflating them is how money goes missing.
 */
export function PositionValueForm({
  investmentId,
  principal,
  currentAccrued,
  minReturnPct,
  compact = false
}: {
  investmentId: string;
  principal: number;
  currentAccrued: number;
  minReturnPct?: number | null;
  compact?: boolean;
}) {
  const router = useRouter();

  const toPct = (a: number) => (principal > 0 ? (a / principal) * 100 : 0);
  const [pct, setPct] = useState(toPct(currentAccrued).toFixed(2));
  const [profit, setProfit] = useState(currentAccrued.toFixed(2));
  const [total, setTotal] = useState((principal + currentAccrued).toFixed(2));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function syncFromProfit(a: number) {
    setProfit(a.toFixed(2));
    setPct(toPct(a).toFixed(2));
    setTotal((principal + a).toFixed(2));
  }

  function onPctChange(v: string) {
    setPct(v);
    const p = parseFloat(v);
    if (!Number.isNaN(p)) {
      const a = (principal * p) / 100;
      setProfit(a.toFixed(2));
      setTotal((principal + a).toFixed(2));
    }
  }

  function onProfitChange(v: string) {
    setProfit(v);
    const a = parseFloat(v);
    if (!Number.isNaN(a)) {
      setPct(toPct(a).toFixed(2));
      setTotal((principal + a).toFixed(2));
    }
  }

  function onTotalChange(v: string) {
    setTotal(v);
    const tv = parseFloat(v);
    if (!Number.isNaN(tv)) {
      const a = tv - principal;
      setProfit(a.toFixed(2));
      setPct(toPct(a).toFixed(2));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const parsedProfit = parseFloat(profit);
    if (Number.isNaN(parsedProfit)) return setError("Enter a valid figure.");
    if (parsedProfit < 0) return setError("Profit can't be negative — the floor is 0.");

    setLoading(true);
    const res = await fetch(`/api/investments/${investmentId}/accrue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accrued_return: parsedProfit })
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return setError(data.error ?? "Failed to update.");
    }
    setSaved(true);
    router.refresh();
  }

  const pctNum = parseFloat(pct);
  const belowFloor = minReturnPct != null && !Number.isNaN(pctNum) && pctNum < minReturnPct;

  const field = "rounded-md border border-border bg-panel-2 px-2 py-1 text-xs text-text-primary outline-none focus:border-brand";

  return (
    <form onSubmit={handleSubmit} className={compact ? "" : "rounded-xl border border-border/60 bg-panel p-4"}>
      {!compact && (
        <>
          <p className="text-sm font-semibold text-text-primary">Update position value</p>
          <p className="mt-1 text-xs text-text-secondary">
            Sets the floating value of this open position. Type any one of the three — the others
            recalculate from the {formatMoney(principal)} principal. This does not touch the wallet.
          </p>
        </>
      )}

      <div className={`flex flex-wrap items-end gap-2 ${compact ? "" : "mt-3"}`}>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-text-secondary">Gain %</span>
          <input type="number" step="0.01" value={pct} onChange={(e) => onPctChange(e.target.value)} className={`${field} w-20`} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-text-secondary">Profit</span>
          <input
            type="number"
            step="0.01"
            value={profit}
            onChange={(e) => onProfitChange(e.target.value)}
            className={`${field} w-24`}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-text-secondary">Total value</span>
          <input
            type="number"
            step="0.01"
            value={total}
            onChange={(e) => onTotalChange(e.target.value)}
            className={`${field} w-24`}
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-brand px-3 py-1.5 text-xs font-bold text-ink hover:bg-brand-hover disabled:opacity-50"
        >
          {loading ? "…" : "Save"}
        </button>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
        <span className="text-text-secondary">
          Principal <span className="mono-num text-text-primary">{formatMoney(principal)}</span>
        </span>
        {minReturnPct != null && (
          <span className={belowFloor ? "text-negative" : "text-text-secondary"}>
            Floor {minReturnPct}% · uncapped
          </span>
        )}
        {error && <span className="font-medium text-negative">{error}</span>}
        {saved && !error && <span className="font-medium text-positive">Saved — user sees it immediately</span>}
      </div>
    </form>
  );
}

function formatMoney(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
