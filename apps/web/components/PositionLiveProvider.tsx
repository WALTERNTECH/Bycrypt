"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { PositionState } from "@/lib/position";

/**
 * Polls the server for what the open position is worth, and hands that
 * one answer to every component that shows it.
 *
 * One request on a timer, not one per component: the home screen alone
 * renders the figure in four places, and four components each asking
 * would be four chances to disagree as well as four requests.
 *
 * The server is the authority here rather than the browser because the
 * two were pricing from different exchanges — see app/api/positions/live.
 * While the first response is in flight, components fall back to their own
 * local arithmetic, which is close enough to render and is replaced within
 * a second or two by the figure settlement will actually use.
 */

export interface LivePosition {
  id: string;
  state: PositionState;
  livePrice: number | null;
  entryPrice: number | null;
}

const PositionLiveContext = createContext<LivePosition | null>(null);

const POLL_MS = 8000;

export function PositionLiveProvider({
  hasPosition,
  children
}: {
  hasPosition: boolean;
  children: React.ReactNode;
}) {
  const [live, setLive] = useState<LivePosition | null>(null);

  useEffect(() => {
    if (!hasPosition) {
      setLive(null);
      return;
    }

    let cancelled = false;

    async function read() {
      try {
        const res = await fetch("/api/positions/live", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;

        const p = data?.position;
        if (!p) {
          setLive(null);
          return;
        }

        setLive({
          id: String(p.id),
          livePrice: typeof p.live_price === "number" ? p.live_price : null,
          entryPrice: typeof p.entry_price === "number" ? p.entry_price : null,
          state: {
            movePct: typeof p.move_pct === "number" ? p.move_pct : null,
            pnlPct: Number(p.pnl_pct ?? 0),
            pnl: Number(p.pnl ?? 0),
            value: Number(p.value ?? 0),
            settles: Number(p.settles ?? 0),
            basis: p.basis ?? "none",
            leverage: Number(p.leverage ?? 8),
            targetReached: p.target_reached === true
          }
        });
      } catch {
        // Keep the last good figure rather than blanking the screen.
      }
    }

    read();
    const id = setInterval(read, POLL_MS);

    // A position moves while the tab is hidden; re-read on return rather
    // than showing a figure from whenever it was last foregrounded.
    const onVisible = () => {
      if (document.visibilityState === "visible") read();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [hasPosition]);

  return <PositionLiveContext.Provider value={live}>{children}</PositionLiveContext.Provider>;
}

/** The server's figure for this position, or null if it is not the one
 *  being polled or has not arrived yet. */
export function useLivePosition(positionId: string | null): LivePosition | null {
  const live = useContext(PositionLiveContext);
  if (!live || !positionId || live.id !== positionId) return null;
  return live;
}
