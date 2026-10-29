"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePositionState } from "@/hooks/usePositionState";
import { formatUsdt } from "@/lib/format";
import type { OpenPositionRow } from "@/lib/position";

/**
 * Watches the open position against the gain it was set to close at, and
 * asks the server to settle it the moment that gain is reached.
 *
 * It is mounted in the app shell, so it runs on every signed-in screen
 * rather than only on the one that happens to show the position.
 *
 * Worth being plain about the limit: this fires while the app is open. A
 * target crossed overnight with the app shut is settled the next time it
 * is opened, not at the instant it was hit — closing a position needs
 * something awake to notice, and in this deployment the browser is the
 * only thing that is. The UI says so rather than implying a service that
 * does not exist.
 *
 * The server re-checks the target itself before closing anything, so this
 * component is a trigger and never an authority.
 */
export function AutoCloseWatcher({ row }: { row: OpenPositionRow | null }) {
  const router = useRouter();
  const [settled, setSettled] = useState<{ credited: number; pnl: number; target: number } | null>(null);
  const firing = useRef(false);
  const emptyRow: OpenPositionRow = {
    id: "",
    symbol: null,
    principal: 0,
    accrued: 0,
    side: "BUY",
    entryPrice: null,
    targetGainPct: null,
    timeframe: null,
    startedAt: new Date().toISOString()
  };

  const { state } = usePositionState(row ?? emptyRow);
  const reached = !!row && state.targetReached;

  useEffect(() => {
    if (!reached || firing.current) return;
    firing.current = true;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/investments/auto-settle", { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (data?.closed) {
          setSettled({
            credited: Number(data.credited ?? 0),
            pnl: Number(data.pnl ?? 0),
            target: Number(data.target_pct ?? 0)
          });
          router.refresh();
        } else {
          // The server disagreed — the price moved back below target
          // between the browser noticing and the request landing. Re-arm
          // so the next crossing is caught.
          firing.current = false;
        }
      } catch {
        firing.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reached, router]);

  if (!settled) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-md rounded-lg bg-[#17181C] px-4 py-3 text-white shadow-lift"
    >
      <p className="text-[13px] font-bold">Target hit — position closed automatically</p>
      <p className="mt-0.5 text-[12px] text-white/70">
        +{settled.target}% reached.{" "}
        <span className="mono-num font-semibold text-white">
          {formatUsdt(settled.credited, { withSymbol: true })}
        </span>{" "}
        moved to your wallet.
      </p>
      <button
        onClick={() => setSettled(null)}
        className="mt-2 text-[12px] font-semibold text-brand"
      >
        Dismiss
      </button>
    </div>
  );
}
