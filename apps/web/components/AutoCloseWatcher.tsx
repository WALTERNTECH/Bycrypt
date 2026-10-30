"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLivePositions } from "./PositionLiveProvider";
import { formatUsdt } from "@/lib/format";

/**
 * Watches open positions against the gain each was set to close at, and
 * asks the server to settle any that reach it.
 *
 * It is mounted in the app shell, so it runs on every signed-in screen
 * rather than only on the one that happens to show a position.
 *
 * It reads from the live provider rather than polling on its own, so one
 * request serves both the figures on screen and this. With several
 * positions running at once more than one can cross its target between
 * two polls, so the request it sends sweeps all of them rather than
 * naming one.
 *
 * Worth being plain about the limit: this fires while the app is open. A
 * target crossed overnight with the app shut is settled the next time it
 * is opened, not at the instant it was hit — closing a position needs
 * something awake to notice, and in this deployment the browser is the
 * only thing that is.
 *
 * The server re-checks every target itself before closing anything, so
 * this component is a trigger and never an authority.
 */
export function AutoCloseWatcher() {
  const router = useRouter();
  const { byId, refresh } = useLivePositions();
  const [settled, setSettled] = useState<{ count: number; credited: number; pnl: number } | null>(null);
  const firing = useRef(false);

  const reachedIds = Object.values(byId)
    .filter((p) => p.state.targetReached)
    .map((p) => p.id)
    .sort()
    .join(",");

  useEffect(() => {
    if (!reachedIds || firing.current) return;
    firing.current = true;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/investments/auto-settle", { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (data?.closed > 0) {
          setSettled({
            count: Number(data.closed),
            credited: Number(data.credited ?? 0),
            pnl: Number(data.pnl ?? 0)
          });
          refresh();
          router.refresh();
        }
        // Re-arm either way: if the server disagreed, the price moved back
        // below target between the browser noticing and the request
        // landing, and the next crossing should still be caught.
        firing.current = false;
      } catch {
        firing.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reachedIds, router, refresh]);

  if (!settled) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-md rounded-lg bg-[#17181C] px-4 py-3 text-white shadow-lift lg:bottom-6"
    >
      <p className="text-[13px] font-bold">
        {settled.count === 1
          ? "Target hit — position closed automatically"
          : `${settled.count} targets hit — positions closed automatically`}
      </p>
      <p className="mt-0.5 text-[12px] text-white/70">
        <span className="mono-num font-semibold text-white">
          {formatUsdt(settled.credited, { withSymbol: true })}
        </span>{" "}
        moved to your wallet.
      </p>
      <button onClick={() => setSettled(null)} className="mt-2 text-[12px] font-semibold text-brand">
        Dismiss
      </button>
    </div>
  );
}
