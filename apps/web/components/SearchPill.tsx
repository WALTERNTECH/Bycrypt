"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveTickers } from "@/hooks/useLiveTickers";

/**
 * The header search.
 *
 * Two things carry it. The fill is a warm gradient rather than flat grey,
 * which is what makes the top of the screen feel like a trading app
 * instead of a form. And the placeholder cycles through what is actually
 * moving right now, each one flagged with a flame, so the bar is a live
 * feed of where to look rather than the word "Search".
 *
 * The trending list is ranked from the live ticker feed by the size of
 * the move in either direction — nothing is curated, so nothing goes
 * stale and no one has to maintain a list.
 *
 * Rotation pauses while the field is focused: text changing under someone
 * who is typing is worse than no motion at all. prefers-reduced-motion
 * holds it on the first entry.
 */
export function SearchPill({ symbols }: { symbols: { symbol: string; display_name: string }[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState("");
  const { tickers } = useLiveTickers(symbols.map((s) => s.symbol));

  const trending = (() => {
    const withData = symbols
      .map((s) => ({ ...s, t: tickers[s.symbol] }))
      .filter((s) => !!s.t)
      .sort((a, b) => Math.abs(b.t!.priceChangePercent) - Math.abs(a.t!.priceChangePercent));
    const list = withData.length > 0 ? withData : symbols.map((s) => ({ ...s, t: undefined }));
    return list.length > 0 ? list.slice(0, 6) : [{ symbol: "BTCUSDT", display_name: "Bitcoin", t: undefined }];
  })();

  useEffect(() => {
    if (focused) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const id = setInterval(() => setIndex((i) => i + 1), 2600);
    return () => clearInterval(id);
  }, [focused]);

  const current = trending[index % trending.length];
  const coin = current.symbol.replace("USDT", "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    // An empty search takes the suggestion on screen, which is what the
    // rotating placeholder implies it will do.
    router.push(`/markets?q=${encodeURIComponent(q ? q.toUpperCase() : coin)}`);
  }

  return (
    <form onSubmit={submit} className="min-w-0 flex-1">
      <div className="flex h-9 items-center gap-2 rounded-full bg-gradient-to-r from-[#FFEFC9] via-[#FFF8E8] to-[#F4F5F7] px-3">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          className="h-4 w-4 shrink-0 text-[#8A6A1F]"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.2-3.2" strokeLinecap="round" />
        </svg>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-label="Search markets"
          className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-text-primary outline-none placeholder:text-[#7A6B4A]"
          placeholder={`🔥 ${coin}/USDT`}
        />
        {!focused && !value && current.t && (
          <span
            aria-hidden
            className={`mono-num shrink-0 text-[11px] font-bold ${
              current.t.priceChangePercent >= 0 ? "text-positive" : "text-negative"
            }`}
          >
            {current.t.priceChangePercent >= 0 ? "+" : ""}
            {current.t.priceChangePercent.toFixed(2)}%
          </span>
        )}
      </div>
    </form>
  );
}
