"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js. The worker exists to make the app installable —
 * Chrome will not offer installation without one — so registration
 * failing is not worth surfacing to the user; the app is fully
 * functional either way.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // Registering after load keeps it off the critical path.
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("[sw] registration failed", err);
      });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
