/*
 * Krypton service worker.
 *
 * Its job is to make the app installable, not to make it work offline.
 * That distinction drives every decision here: this app shows wallet
 * balances, open positions and deposit states, and a cached copy of any
 * of those is worse than no copy at all — a user acting on a stale
 * balance is a real problem, an app that says "you're offline" is not.
 *
 * So the policy is deliberately narrow:
 *
 *   - Immutable, content-hashed build assets (/_next/static/*) and the
 *     icon set are cache-first. Their URLs change when the content does,
 *     so they can never go stale.
 *   - Everything else — every document, every API call, every Supabase
 *     or Binance request — is network-only and is never written to a
 *     cache.
 *
 * Chrome's installability check only requires a fetch handler, which the
 * static-asset path satisfies.
 */

const VERSION = "krypton-v1";
const STATIC_CACHE = `${VERSION}-static`;

// Precaching the icons means the install prompt and home-screen icon
// resolve instantly even on a cold first visit.
const PRECACHE = [
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      // A failed precache must not abort activation — the app works fine
      // without it.
      .then((cache) => cache.addAll(PRECACHE).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isImmutableAsset(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/"))
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only ever touch same-origin GETs. Anything else (POSTs to the API,
  // Supabase, Binance) goes straight to the network untouched.
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }

  if (!isImmutableAsset(url)) return; // network-only: no caching, no interception

  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        // Only store complete, successful responses.
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      });
    })
  );
});

// Lets a new build tell the previous worker to step aside immediately.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
