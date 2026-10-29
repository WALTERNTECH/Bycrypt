"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Pulls the app up to date, in both senses.
 *
 * Two different things can make the screen stale, and the button does
 * something about each:
 *
 *   Stale data    — balances, positions and deposit states are rendered
 *                   on the server, so router.refresh() re-fetches them
 *                   without a full page load.
 *   Stale build   — once the app is installed to a home screen it keeps
 *                   running the worker it was installed with. Asking the
 *                   registration to update picks up a newly deployed
 *                   build; if one is waiting we tell it to take over and
 *                   reload into it.
 *
 * The reload only happens when there genuinely is a new version waiting,
 * so the ordinary case stays a quiet in-place refresh rather than a jarring
 * full reload.
 */
export function RefreshButton() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");

  async function refresh() {
    if (state === "busy") return;
    setState("busy");

    // Check for a newer deployed build.
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.update();
          const waiting = reg.waiting;
          if (waiting) {
            // A new build is ready. Hand over and reload into it — the
            // page would otherwise keep running the old one until every
            // tab is closed.
            waiting.postMessage("SKIP_WAITING");
            waiting.addEventListener("statechange", () => {
              if (waiting.state === "activated") window.location.reload();
            });
            // If the handover never reports back, reload anyway rather
            // than leaving the button spinning indefinitely.
            setTimeout(() => window.location.reload(), 2500);
            return;
          }
        }
      }
    } catch {
      // An update check failing must never block the data refresh.
    }

    router.refresh();

    // Hold the spinner briefly so the refresh reads as having happened —
    // router.refresh() resolves before the new markup paints.
    setTimeout(() => {
      setState("done");
      setTimeout(() => setState("idle"), 1200);
    }, 600);
  }

  return (
    <button
      onClick={refresh}
      disabled={state === "busy"}
      aria-label="Refresh"
      title="Refresh"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-header-border bg-header-2 text-header-text shadow-sm transition-all duration-150 hover:bg-header-3 active:translate-y-px active:shadow-none disabled:opacity-60"
    >
      {state === "done" ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="h-[17px] w-[17px] text-positive">
          <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          className={`h-[17px] w-[17px] ${state === "busy" ? "animate-spin" : ""}`}
        >
          <path d="M21 12a9 9 0 1 1-2.64-6.36" strokeLinecap="round" />
          <path d="M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
