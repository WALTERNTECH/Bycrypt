"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLivePositions } from "./PositionLiveProvider";
import { formatUsdt, formatPct } from "@/lib/format";
import { Button } from "./ui";

type Scope = "all" | "winning" | "losing";

const LABEL: Record<Scope, string> = {
  all: "Close all",
  winning: "Close winning",
  losing: "Close losing"
};

/**
 * Close several positions at once, the way a terminal does it.
 *
 * The counts beside each action come from the live figures, so you can
 * see what a button will touch before pressing it — "Close winning (3)"
 * is a different proposition from "Close winning" alone when six are
 * open.
 *
 * Which positions actually match is decided server-side at the moment
 * each one settles, not from these counts. Seconds pass between the
 * press and the last settlement, and a position can cross from profit to
 * loss in that time; the figure here is for reading, not for deciding.
 *
 * Every scope confirms first. These are irreversible and they move real
 * balances, and "close all" is one tap away from "close winning".
 */
export function BulkCloseBar() {
  const router = useRouter();
  const { totals, refresh } = useLivePositions();
  const [confirming, setConfirming] = useState<Scope | null>(null);
  const [busy, setBusy] = useState<Scope | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!totals || totals.count === 0) return null;

  const counts: Record<Scope, number> = {
    all: totals.count,
    winning: totals.winning,
    losing: totals.losing
  };

  async function run(scope: Scope) {
    setBusy(scope);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/investments/close-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope })
      });
      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : null;
      if (!res.ok) {
        setError(data?.error ?? "Could not close those positions.");
        return;
      }
      if ((data?.closed ?? 0) === 0) {
        setResult("Nothing matched — no positions were closed.");
      } else {
        const pnl = Number(data.pnl ?? 0);
        setResult(
          `${data.closed} closed · ${formatUsdt(Number(data.credited ?? 0), { withSymbol: true })} to your wallet · ${
            pnl >= 0 ? "+" : "−"
          }${formatUsdt(Math.abs(pnl), { withSymbol: true })}`
        );
      }
      if (Array.isArray(data?.errors) && data.errors.length > 0) {
        setError(`${data.errors.length} could not be closed. Try again.`);
      }
      refresh();
      router.refresh();
    } catch {
      setError("Could not reach the server. Try again in a moment.");
    } finally {
      setBusy(null);
      setConfirming(null);
    }
  }

  const up = totals.pnl >= 0;

  return (
    <div className="rounded-lg bg-surface-2 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-text-primary">
            {totals.count} open position{totals.count === 1 ? "" : "s"}
          </p>
          <p className="mt-0.5 text-[11px] text-text-tertiary">
            {totals.winning} up · {totals.losing} down · invested{" "}
            {formatUsdt(totals.invested, { withSymbol: true })}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`mono-num text-[17px] font-bold leading-none ${up ? "text-positive" : "text-negative"}`}>
            {up ? "+" : "−"}
            {formatUsdt(Math.abs(totals.pnl))}
          </p>
          <p className="mono-num mt-1 text-[11px] text-text-secondary">
            {formatPct(totals.invested > 0 ? (totals.pnl / totals.invested) * 100 : 0, { signed: true })}
          </p>
        </div>
      </div>

      {confirming ? (
        <div data-confirm-open className="mt-3 rounded-lg bg-base p-3">
          <p className="text-[12px] leading-relaxed text-text-secondary">
            Close{" "}
            <span className="font-bold text-text-primary">
              {confirming === "all"
                ? `all ${counts.all} positions`
                : `the ${counts[confirming]} ${confirming} position${counts[confirming] === 1 ? "" : "s"}`}
            </span>{" "}
            and move their value into your wallet? This cannot be undone.
          </p>
          <div className="mt-2.5 flex gap-2">
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              onClick={() => run(confirming)}
              disabled={busy !== null}
            >
              {busy ? "Closing…" : `Yes, ${LABEL[confirming].toLowerCase()}`}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setConfirming(null)} disabled={busy !== null}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(["all", "winning", "losing"] as Scope[]).map((scope) => (
            <button
              key={scope}
              onClick={() => setConfirming(scope)}
              disabled={counts[scope] === 0}
              className={`rounded-lg py-2 text-[12px] font-bold transition-colors disabled:opacity-35 ${
                scope === "winning"
                  ? "bg-positive-dim text-positive hover:bg-[#DDF2E8]"
                  : scope === "losing"
                    ? "bg-negative-dim text-negative hover:bg-[#FBE0E1]"
                    : "bg-base text-text-primary hover:bg-surface-3"
              }`}
            >
              {LABEL[scope]}
              {counts[scope] > 0 && <span className="mono-num ml-1 opacity-70">{counts[scope]}</span>}
            </button>
          ))}
        </div>
      )}

      {result && <p className="mt-2 text-[11px] font-medium text-text-secondary">{result}</p>}
      {error && <p className="mt-2 text-[11px] font-medium text-negative">{error}</p>}
    </div>
  );
}
