"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui";
import { formatUsdt } from "@/lib/format";
import { useLiveTickers } from "@/hooks/useLiveTickers";
import { settlementOf } from "./SettlementValue";

/**
 * Closing is always available while a position is open — there is no
 * profit gate. Settling at a flat return is a legitimate exit, and
 * gating it was what left users stuck in a position they could not get
 * out of.
 *
 * The amount quoted in the confirmation is computed exactly as the
 * server computes it at settlement, so the figure a user agrees to is
 * the figure that lands in their wallet.
 */
export function ClosePositionButton({
  investmentId,
  symbol,
  principal,
  accrued,
  size = "md",
  fullWidth = true
}: {
  investmentId: string;
  symbol: string | null;
  principal: number;
  accrued: number;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}) {
  const router = useRouter();
  const { tickers } = useLiveTickers(symbol ? [symbol] : []);
  const rawPct = symbol ? (tickers[symbol]?.priceChangePercent ?? 0) : 0;
  const { total, profit } = settlementOf(principal, accrued, rawPct);

  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function close() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/investments/${investmentId}/cashout`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Could not close this position.");
      setConfirming(false);
      return;
    }
    router.refresh();
  }

  if (confirming) {
    return (
      // data-confirm-open lets the install banner stand down while a
      // confirmation is on screen — it is fixed to the bottom of the
      // viewport and was landing on top of these buttons.
      <div data-confirm-open className="rounded-xl border border-border-strong bg-surface-2 p-3">
        <p className="text-xs leading-relaxed text-text-secondary">
          Close this position and move{" "}
          <span className="mono-num font-bold text-text-primary">{formatUsdt(total, { withSymbol: true })}</span> into
          your Krypton wallet
          {profit > 0 && (
            <>
              {" "}
              — that's{" "}
              <span className="mono-num font-bold text-text-primary">
                {formatUsdt(principal, { withSymbol: true })}
              </span>{" "}
              back plus{" "}
              <span className="mono-num font-bold text-positive">{formatUsdt(profit, { withSymbol: true })}</span>{" "}
              profit
            </>
          )}
          . You can withdraw from the wallet after that.
        </p>
        <div className="mt-3 flex gap-2">
          <Button variant="danger" size="sm" onClick={close} disabled={loading} className="flex-1">
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
      <Button variant="danger" size={size} fullWidth={fullWidth} onClick={() => setConfirming(true)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-4 w-4">
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
        Close position
      </Button>
      {error && <p className="mt-2 text-xs font-medium text-negative">{error}</p>}
    </div>
  );
}
