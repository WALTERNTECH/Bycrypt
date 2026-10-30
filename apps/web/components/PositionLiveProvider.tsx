"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { PositionState } from "@/lib/position";

/**
 * Polls the server for what the open positions are worth, and hands those
 * answers to every component that shows one.
 *
 * One request on a timer, not one per component: the home screen alone
 * renders these figures in several places, and each component asking
 * separately would be several chances to disagree as well as several
 * requests. With positions now running side by side that matters more —
 * a screen showing six of them would otherwise make six calls a tick.
 *
 * The server is the authority rather than the browser because the two
 * were pricing from different exchanges — see app/api/positions/live.
 * While the first response is in flight, components fall back to their
 * own local arithmetic, which is close enough to render and is replaced
 * within a second or two by the figure settlement will actually use.
 */

export interface LivePosition {
  id: string;
  state: PositionState;
  livePrice: number | null;
  entryPrice: number | null;
}

export interface LiveTotals {
  count: number;
  invested: number;
  pnl: number;
  settles: number;
  winning: number;
  losing: number;
}

interface LiveContext {
  byId: Record<string, LivePosition>;
  totals: LiveTotals | null;
  /** Re-reads immediately — used after closing, so the screen does not
   *  sit on a figure for a position that no longer exists. */
  refresh: () => void;
}

const PositionLiveContext = createContext<LiveContext>({ byId: {}, totals: null, refresh: () => {} });

const POLL_MS = 8000;

export function PositionLiveProvider({
  hasPosition,
  children
}: {
  hasPosition: boolean;
  children: React.ReactNode;
}) {
  const [byId, setById] = useState<Record<string, LivePosition>>({});
  const [totals, setTotals] = useState<LiveTotals | null>(null);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!hasPosition) {
      setById({});
      setTotals(null);
      return;
    }

    let cancelled = false;

    async function read() {
      try {
        const res = await fetch("/api/positions/live", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;

        const next: Record<string, LivePosition> = {};
        for (const p of data?.positions ?? []) {
          next[String(p.id)] = {
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
          };
        }
        setById(next);
        setTotals(data?.totals ?? null);
      } catch {
        // Keep the last good figures rather than blanking the screen.
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
  }, [hasPosition, nonce]);

  return (
    <PositionLiveContext.Provider value={{ byId, totals, refresh }}>
      {children}
    </PositionLiveContext.Provider>
  );
}

/** The server's figure for one position, or null before it arrives. */
export function useLivePosition(positionId: string | null): LivePosition | null {
  const { byId } = useContext(PositionLiveContext);
  if (!positionId) return null;
  return byId[positionId] ?? null;
}

/** Every position's figure at once, plus the aggregate. */
export function useLivePositions(): LiveContext {
  return useContext(PositionLiveContext);
}
