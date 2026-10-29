"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * The header search.
 *
 * The placeholder cycles through live markets rather than sitting
 * static, which is what makes the top of an exchange app feel like it is
 * running rather than waiting. Each suggestion is a real symbol from the
 * platform's own market list, so tapping through lands somewhere real.
 *
 * The rotation pauses while the field is focused — text changing under
 * someone who is typing is worse than no motion at all. It also respects
 * prefers-reduced-motion by holding on the first entry.
 */
export function SearchPill({ symbols }: { symbols: { symbol: string; display_name: string }[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState("");

  const suggestions = symbols.length > 0 ? symbols : [{ symbol: "BTCUSDT", display_name: "Bitcoin" }];

  useEffect(() => {
    if (focused) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const id = setInterval(() => setIndex((i) => (i + 1) % suggestions.length), 2600);
    return () => clearInterval(id);
  }, [focused, suggestions.length]);

  const current = suggestions[index % suggestions.length];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    // An empty search takes the suggestion on screen, which is what the
    // rotating placeholder implies it will do.
    const target = q ? q.toUpperCase() : current.symbol.replace("USDT", "");
    router.push(`/markets?q=${encodeURIComponent(target)}`);
  }

  return (
    <form onSubmit={submit} className="min-w-0 flex-1">
      <div className="flex h-9 items-center gap-2 rounded-full bg-surface-2 px-3">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          className="h-4 w-4 shrink-0 text-text-tertiary"
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
          className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-text-primary outline-none placeholder:text-text-tertiary"
          placeholder={`${current.display_name} · ${current.symbol.replace("USDT", "")}/USDT`}
        />
      </div>
    </form>
  );
}
