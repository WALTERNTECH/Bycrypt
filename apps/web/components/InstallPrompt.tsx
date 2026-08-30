"use client";

import { useEffect, useState } from "react";

/**
 * Install prompt.
 *
 * Chrome/Edge/Android fire `beforeinstallprompt`, which hands us a
 * deferred event we can trigger from our own button — so the prompt is
 * a real one-tap install.
 *
 * iOS Safari has no install API at all. There, the only route is
 * Share -> Add to Home Screen, so that platform gets a short
 * instruction sheet instead of a button that could not work.
 *
 * The sheet never appears when the app is already installed (it launches
 * in standalone display mode), and a dismissal is remembered so it does
 * not nag on every visit.
 */

const DISMISS_KEY = "krypton-install-dismissed";
const DISMISS_DAYS = 14;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function recentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS reports installed state on navigator, not via display-mode.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPadOS 13+ reports as a Mac; the touch points give it away.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosMode, setIosMode] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    // Android/desktop Chrome: capture the event and show our own UI
    // instead of the browser's mini-infobar.
    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // Once installed, get out of the way for good.
    function onInstalled() {
      setVisible(false);
      try {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
      } catch {
        /* private mode */
      }
    }
    window.addEventListener("appinstalled", onInstalled);

    // iOS never fires the event, so surface the manual route after a
    // beat — long enough not to fight the first paint.
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isIos()) {
      timer = setTimeout(() => {
        setIosMode(true);
        setVisible(true);
      }, 2500);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      if (timer) clearTimeout(timer);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* private mode */
    }
  }

  async function install() {
    if (!deferred) return;
    setInstalling(true);
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted" || outcome === "dismissed") {
        setVisible(false);
        // A declined native prompt shouldn't re-ask on the next page view.
        if (outcome === "dismissed") dismiss();
      }
    } finally {
      setInstalling(false);
      setDeferred(null);
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
      {/* scrim so the sheet reads as a layer above the app */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />

      <div className="rise-in relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface shadow-lift">
        <div className="flex items-start gap-3 p-4">
          <img
            src="/icons/icon-192.png"
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 rounded-xl shadow-sm"
          />

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-text-primary">Install Krypton</p>
            <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
              {iosMode
                ? "Add Krypton to your Home Screen for full-screen access and faster launches."
                : "Get the full-screen app on your device — faster launches, no browser bar."}
            </p>
          </div>

          <button
            onClick={dismiss}
            aria-label="Dismiss install prompt"
            className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-surface-3 hover:text-text-primary"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {iosMode ? (
          <div className="border-t border-border px-4 py-3">
            <ol className="space-y-2 text-xs text-text-secondary">
              <li className="flex items-center gap-2">
                <Step n={1} />
                <span className="flex items-center gap-1.5">
                  Tap
                  <ShareIcon />
                  <span className="font-semibold text-text-primary">Share</span>
                  in the toolbar
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Step n={2} />
                <span>
                  Choose <span className="font-semibold text-text-primary">Add to Home Screen</span>
                </span>
              </li>
            </ol>
          </div>
        ) : (
          <div className="flex gap-2 border-t border-border p-3">
            <button
              onClick={install}
              disabled={installing || !deferred}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#C9990A] bg-gradient-to-b from-brand-hover to-brand py-3 text-sm font-bold leading-none text-ink shadow-btn-brand transition-all duration-150 hover:from-[#FFD84D] hover:to-[#F7C21A] active:translate-y-px active:shadow-none disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-4 w-4">
                <path d="M12 4v11M12 15l-4-4M12 15l4-4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 19h14" strokeLinecap="round" />
              </svg>
              {installing ? "Installing…" : "Install app"}
            </button>
            <button
              onClick={dismiss}
              className="rounded-xl border border-border-strong bg-gradient-to-b from-surface-3 to-surface-2 px-4 text-sm font-bold text-text-primary shadow-btn transition-all duration-150 active:translate-y-px active:shadow-none"
            >
              Not now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Step({ n }: { n: number }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface-2 text-[10px] font-bold text-text-secondary">
      {n}
    </span>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} className="h-4 w-4 text-info">
      <path d="M12 15V4M12 4 8.5 7.5M12 4l3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 12H5a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1h-1" strokeLinecap="round" />
    </svg>
  );
}
