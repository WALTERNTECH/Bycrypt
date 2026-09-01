"use client";

import { useEffect, useState } from "react";

/**
 * Install prompt.
 *
 * There are four distinct situations and each needs different words,
 * because offering an Install button that cannot work is worse than
 * offering nothing:
 *
 *   chrome   Chrome/Edge/Android fired `beforeinstallprompt`, so we hold
 *            the deferred event and installing is genuinely one tap.
 *
 *   inapp    The page is inside WhatsApp/Telegram/Instagram/Facebook's
 *            embedded browser. These never fire the event and cannot
 *            install at all — the only way out is to reopen the link in
 *            a real browser. This is the common case in practice, since
 *            links get shared through chat apps, and it's exactly how a
 *            user ends up hunting for an APK instead.
 *
 *   ios      iOS Safari has no install API; Share -> Add to Home Screen
 *            is the only route.
 *
 *   manual   A real browser that hasn't fired the event (yet, or at
 *            all). Point at the browser menu rather than claim nothing
 *            is possible.
 *
 * Hidden entirely when already installed, and a dismissal is remembered
 * so it doesn't nag.
 */

const DISMISS_KEY = "krypton-install-dismissed";
const DISMISS_DAYS = 14;
const MANUAL_FALLBACK_MS = 3500;

type Mode = "chrome" | "inapp" | "ios" | "manual";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function recentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    return Number.isFinite(at) && Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * Embedded chat-app browsers. Android ones are WebViews and carry the
 * "; wv)" token; iOS ones don't, so each app is matched by name too.
 */
function detectInAppBrowser(): string | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;

  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return "Facebook";
  if (/Instagram/i.test(ua)) return "Instagram";
  if (/WhatsApp/i.test(ua)) return "WhatsApp";
  if (/\bLine\//i.test(ua)) return "LINE";
  if (/MicroMessenger/i.test(ua)) return "WeChat";
  if (/Twitter|TwitterAndroid/i.test(ua)) return "X";
  if (/TelegramBot|Telegram/i.test(ua)) return "Telegram";
  // Generic Android WebView — Telegram and several others land here.
  if (/Android/i.test(ua) && /;\s*wv\)/i.test(ua)) return "this app";
  return null;
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [installing, setInstalling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inAppName, setInAppName] = useState<string>("this app");

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    const inApp = detectInAppBrowser();

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setMode("chrome"); // a real prompt beats any fallback copy
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    function onInstalled() {
      setMode(null);
      try {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
      } catch {
        /* private mode */
      }
    }
    window.addEventListener("appinstalled", onInstalled);

    let timer: ReturnType<typeof setTimeout> | undefined;
    if (inApp) {
      setInAppName(inApp);
      timer = setTimeout(() => setMode((m) => m ?? "inapp"), 1200);
    } else if (isIos()) {
      timer = setTimeout(() => setMode((m) => m ?? "ios"), 2500);
    } else {
      // Give beforeinstallprompt a chance first; if it never comes,
      // fall back to pointing at the browser menu.
      timer = setTimeout(() => setMode((m) => m ?? "manual"), MANUAL_FALLBACK_MS);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      if (timer) clearTimeout(timer);
    };
  }, []);

  function dismiss() {
    setMode(null);
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
      setMode(null);
      if (outcome === "dismissed") dismiss();
    } finally {
      setInstalling(false);
      setDeferred(null);
    }
  }

  async function copyLink() {
    const url = "https://kryptoninvestments.online";
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard can be blocked inside embedded browsers; select-to-copy
      // via the visible URL text is the fallback.
      setCopied(false);
    }
  }

  if (!mode) return null;

  return (
    <div data-install-prompt className="fixed inset-x-0 bottom-0 z-[60] flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
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
            <p className="text-sm font-bold text-text-primary">
              {mode === "inapp" ? "Open in your browser to install" : "Install Krypton"}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
              {mode === "inapp"
                ? `${inAppName}'s built-in browser can't install apps. Open this link in Chrome or Safari, then install from there.`
                : mode === "ios"
                ? "Add Krypton to your Home Screen for full-screen access and faster launches."
                : mode === "manual"
                ? "Add Krypton to your device from your browser menu for full-screen access."
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

        {mode === "chrome" && (
          <div className="flex gap-2 border-t border-border p-3">
            <button
              onClick={install}
              disabled={installing}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#C9990A] bg-gradient-to-b from-brand-hover to-brand py-3 text-sm font-bold leading-none text-ink shadow-btn-brand transition-all duration-150 hover:from-[#FFD84D] hover:to-[#F7C21A] active:translate-y-px active:shadow-none disabled:opacity-50"
            >
              <DownloadIcon />
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

        {mode === "inapp" && (
          <div className="border-t border-border p-3">
            <ol className="space-y-2 text-xs text-text-secondary">
              <li className="flex items-start gap-2">
                <Step n={1} />
                <span>
                  Tap the <span className="font-semibold text-text-primary">⋮</span> or{" "}
                  <span className="font-semibold text-text-primary">⋯</span> menu at the top of this
                  screen, then{" "}
                  <span className="font-semibold text-text-primary">Open in browser</span>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Step n={2} />
                <span>
                  In Chrome or Safari, tap{" "}
                  <span className="font-semibold text-text-primary">Install</span> when it appears
                </span>
              </li>
            </ol>

            <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2">
              <span className="mono-num min-w-0 flex-1 truncate text-[11px] text-text-secondary">
                kryptoninvestments.online
              </span>
              <button
                onClick={copyLink}
                className="shrink-0 rounded-lg border border-border-strong bg-gradient-to-b from-surface-3 to-surface-2 px-3 py-1.5 text-[11px] font-bold text-text-primary shadow-btn transition-all duration-150 active:translate-y-px active:shadow-none"
              >
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>
          </div>
        )}

        {mode === "ios" && (
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
        )}

        {mode === "manual" && (
          <div className="border-t border-border px-4 py-3">
            <ol className="space-y-2 text-xs text-text-secondary">
              <li className="flex items-start gap-2">
                <Step n={1} />
                <span>
                  Open your browser menu (<span className="font-semibold text-text-primary">⋮</span>)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Step n={2} />
                <span>
                  Tap <span className="font-semibold text-text-primary">Install app</span> or{" "}
                  <span className="font-semibold text-text-primary">Add to Home screen</span>
                </span>
              </li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

function Step({ n }: { n: number }) {
  return (
    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface-2 text-[10px] font-bold text-text-secondary">
      {n}
    </span>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-4 w-4">
      <path d="M12 4v11M12 15l-4-4M12 15l4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 19h14" strokeLinecap="round" />
    </svg>
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
