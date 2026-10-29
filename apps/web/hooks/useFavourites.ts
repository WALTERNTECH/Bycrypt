"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "krypton-favourite-markets";

/**
 * Favourite markets, per device.
 *
 * Deliberately local rather than a profiles column: a starred market is a
 * viewing preference, not account data, and putting it in the database
 * would mean a write on every tap of a star. It is wrapped in try/catch
 * throughout because private windows throw on access rather than
 * returning empty.
 */
export function useFavourites() {
  const [favourites, setFavourites] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) setFavourites(parsed.filter((s) => typeof s === "string"));
    } catch {
      /* nothing stored, or storage unavailable */
    }
    setReady(true);
  }, []);

  const toggle = useCallback((symbol: string) => {
    setFavourites((prev) => {
      const next = prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* nothing to persist to */
      }
      return next;
    });
  }, []);

  const isFavourite = useCallback((symbol: string) => favourites.includes(symbol), [favourites]);

  return { favourites, toggle, isFavourite, ready };
}
