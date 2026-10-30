"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui";
import { formatUsdt } from "@/lib/format";
import { usePositionState } from "@/hooks/usePositionState";
import { useLivePositions } from "./PositionLiveProvider";
import type { OpenPositionRow } from "@/lib/position";

/**
 * Closing is always available while a position is open — there is no
 * profit gate. The amount quoted in the confirmation is computed exactly
 * as the server computes it at settlement, so the figure a user agrees to
 * is the figure that lands in their wallet.
 *
 * The control is no longer red. Red here meant "destructive", which made
 * taking money out of a trade look like a mistake, and it was the only
 * saturated red on an otherwise calm screen. Closing is the position's
 * primary action, so it wears the app's primary colour; red stays for the
 * sell side of the order pad, where it means direction, not danger.
 */
export function ClosePositionButton({
  row,
  size = "md",
  fullWidth = true
}: {
  row: OpenPositionRow;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}) {
  const router = useRouter();
  const { state } = usePositionState(row);
  const { refresh } = useLivePositions();

  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function close() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/investments/${row.id}/cashout`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Could not close this position.");
      setConfirming(false);
      return;
    }
    refresh();
    router.refresh();
  }

  if (confirming) {
    const profit = state.settles - row.principal;
    return (
      // data-confirm-open lets the install banner stand down while a
      // confirmation is on screen — it is fixed to the bottom of the
      // viewport and was landing on top of these buttons.
      <div data-confirm-open className="rounded-lg bg-surface-2 p-3">
        <p className="text-xs leading-relaxed text-text-secondary">
          Close this {row.side === "SELL" ? "sell" : "buy"} position and move{" "}
          <span className="mono-num font-bold text-text-primary">
            {formatUsdt(state.settles, { withSymbol: true })}
          </span>{" "}
          into your Krypton wallet — that&apos;s{" "}
          <span className="mono-num font-bold text-text-primary">
            {formatUsdt(row.principal, { withSymbol: true })}
          </span>{" "}
          invested{" "}
          {profit >= 0 ? (
            <>
              plus{" "}
              <span className="mono-num font-bold text-positive">
                {formatUsdt(profit, { withSymbol: true })}
              </span>{" "}
              gained
            </>
          ) : (
            <>
              less{" "}
              <span className="mono-num font-bold text-negative">
                {formatUsdt(Math.abs(profit), { withSymbol: true })}
              </span>{" "}
              lost
            </>
          )}
          .
        </p>
        <div className="mt-3 flex gap-2">
          <Button variant="primary" size="sm" onClick={close} disabled={loading} className="flex-1">
            {loading ? "Closing…" : "Confirm close"}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setConfirming(false)} disabled={loading}>
            Cancel
          </Button>
        </div>
        {error && <p className="mt-2 text-xs font-medium text-negative">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <Button variant="primary" size={size} fullWidth={fullWidth} onClick={() => setConfirming(true)}>
        Close position
      </Button>
      {error && <p className="mt-2 text-xs font-medium text-negative">{error}</p>}
    </div>
  );
}
