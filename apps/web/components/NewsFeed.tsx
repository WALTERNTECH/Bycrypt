"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLiveTickers } from "@/hooks/useLiveTickers";
import { formatPct } from "@/lib/format";
import { NEWS_CATEGORIES, type NewsItem } from "@/lib/news";

/**
 * The market feed.
 *
 * Cards in the shape of the reference app — source, time, headline,
 * picture, ticker chips, an action row — over a stream that keeps loading
 * as you reach the bottom. It replaces a position-history button and a
 * risk notice, neither of which gave anyone a reason to stay on the
 * screen.
 *
 * The chips carry a live price change, so a headline about Bitcoin says
 * what Bitcoin is doing while you read it. They only appear for coins
 * this platform lists, because a chip that cannot be priced is decoration.
 *
 * The action row has no counts. The reference shows likes and reposts;
 * there is nobody posting here and nothing to count, and a fabricated
 * "41" sitting under a real headline, on a screen where every other
 * number is real money, is the one thing this row must not do.
 */

const PAGE_SIZE = 12;

function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const SOURCE_TINT: Record<string, string> = {
  coindesk: "#1E6FD9",
  cointelegraph: "#FFC000",
  decrypt: "#1A1A1A",
  cryptopotato: "#F7931A",
  newsbtc: "#2EA44F"
};

export function NewsFeed({
  initialItems,
  initialNextPage,
  showTabs = true
}: {
  initialItems: NewsItem[];
  initialNextPage: number | null;
  showTabs?: boolean;
}) {
  const [category, setCategory] = useState<string>("all");
  const [items, setItems] = useState<NewsItem[]>(initialItems);
  const [nextPage, setNextPage] = useState<number | null>(initialNextPage);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const symbols = useMemo(
    () => Array.from(new Set(items.flatMap((i) => i.symbols))),
    [items]
  );
  const { tickers } = useLiveTickers(symbols);

  const load = useCallback(
    async (page: number, cat: string, replace: boolean) => {
      setLoading(true);
      setFailed(false);
      try {
        const res = await fetch(`/api/news?page=${page}&limit=${PAGE_SIZE}&category=${cat}`);
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        const incoming: NewsItem[] = Array.isArray(data.items) ? data.items : [];
        setItems((prev) => {
          if (replace) return incoming;
          // The desks republish; without this a story already on screen
          // can arrive again on the next page and React warns on the key.
          const seen = new Set(prev.map((i) => i.id));
          return [...prev, ...incoming.filter((i) => !seen.has(i.id))];
        });
        setNextPage(data.nextPage ?? null);
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  function switchCategory(next: string) {
    if (next === category) return;
    setCategory(next);
    setItems([]);
    setNextPage(null);
    load(1, next, true);
  }

  // Loads the next page as the end of the list comes into view, a screen
  // early so the scroll never actually stops.
  useEffect(() => {
    const node = sentinel.current;
    if (!node || nextPage === null) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loading) load(nextPage, category, false);
      },
      { rootMargin: "600px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [nextPage, loading, category, load]);

  return (
    <section className="mt-6">
      {showTabs && (
        <div className="-mx-4 mb-1 flex gap-5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NEWS_CATEGORIES.map((c) => {
            const active = category === c.id;
            return (
              <button
                key={c.id}
                onClick={() => switchCategory(c.id)}
                className="relative shrink-0 pb-2 text-[14px] transition-colors"
              >
                <span className={active ? "font-bold text-text-primary" : "font-medium text-text-tertiary"}>
                  {c.label}
                </span>
                {active && (
                  <span className="absolute inset-x-0 -bottom-px mx-auto h-[3px] w-5 rounded-full bg-brand" />
                )}
              </button>
            );
          })}
        </div>
      )}

      <div>
        {items.map((item) => (
          <NewsCard key={item.id} item={item} tickers={tickers} />
        ))}
      </div>

      {items.length === 0 && !loading && (
        <p className="py-10 text-center text-[12px] text-text-tertiary">
          {failed ? "Could not load the feed just now." : "Nothing here yet."}
        </p>
      )}

      {loading && (
        <div className="space-y-4 py-4">
          {[0, 1].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-surface-2" />
                <div className="h-3 w-28 rounded bg-surface-2" />
              </div>
              <div className="mt-3 h-4 w-full rounded bg-surface-2" />
              <div className="mt-2 h-4 w-3/5 rounded bg-surface-2" />
            </div>
          ))}
        </div>
      )}

      {failed && items.length > 0 && (
        <button
          onClick={() => load(nextPage ?? 1, category, false)}
          className="mx-auto my-4 block rounded-lg bg-surface-2 px-4 py-2 text-[12px] font-bold text-text-primary"
        >
          Try again
        </button>
      )}

      {nextPage === null && items.length > 0 && !loading && (
        <p className="py-6 text-center text-[11px] text-text-tertiary">You&apos;re all caught up.</p>
      )}

      <div ref={sentinel} aria-hidden className="h-1" />
    </section>
  );
}

function NewsCard({
  item,
  tickers
}: {
  item: NewsItem;
  tickers: Record<string, { priceChangePercent: number }>;
}) {
  const [copied, setCopied] = useState(false);
  const tint = SOURCE_TINT[item.sourceKey] ?? "#6B7079";

  async function share() {
    const nav = typeof navigator === "undefined" ? null : (navigator as any);
    if (!nav) return;
    try {
      if (typeof nav.share === "function") {
        await nav.share({ title: item.title, url: item.url });
        return;
      }
      await nav.clipboard.writeText(item.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* dismissed, or no clipboard — nothing to report */
    }
  }

  return (
    <article className="border-b border-border/70 py-4 last:border-b-0">
      <header className="flex items-center gap-2.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
          style={{ backgroundColor: tint }}
          aria-hidden
        >
          {item.source.charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-[14px] font-bold text-text-primary">
            <span className="truncate">{item.source}</span>
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-info" aria-label="Verified source">
              <path
                fill="currentColor"
                d="M12 2l2.4 1.8 3-.2.9 2.9 2.4 1.8-1.1 2.8 1.1 2.8-2.4 1.8-.9 2.9-3-.2L12 22l-2.4-1.8-3 .2-.9-2.9L3.3 15.7l1.1-2.8-1.1-2.8L5.7 8.3l.9-2.9 3 .2L12 2z"
              />
              <path d="m8.6 12.2 2.3 2.3 4.5-4.6" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </p>
          <p className="text-[12px] text-text-tertiary">{timeAgo(item.publishedAt)}</p>
        </div>
      </header>

      <a href={item.url} target="_blank" rel="noopener noreferrer" className="group mt-2.5 block">
        <h3 className="text-[15px] font-semibold leading-snug text-text-primary group-hover:text-brand">
          {item.title}
        </h3>
        {item.summary && (
          <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-text-secondary">
            {item.summary}
          </p>
        )}
        {item.image && (
          <div className="mt-3 overflow-hidden rounded-lg bg-surface-2">
            {/* Plain img, not next/image: these are five arbitrary news
                domains and the optimiser would need every one allow-listed
                in config, failing closed on any desk that changes CDN. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.image}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-44 w-full object-cover"
              onError={(e) => {
                (e.currentTarget.parentElement as HTMLElement).style.display = "none";
              }}
            />
          </div>
        )}
      </a>

      {item.symbols.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {item.symbols.map((symbol) => {
            const t = tickers[symbol];
            const coin = symbol.replace("USDT", "");
            const up = (t?.priceChangePercent ?? 0) >= 0;
            return (
              <a
                key={symbol}
                href={`/markets/${symbol}`}
                className="flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-[12px] font-semibold text-text-primary transition-colors hover:bg-surface-3"
              >
                {coin}
                <span className={`mono-num font-bold ${up ? "text-positive" : "text-negative"}`}>
                  {t ? formatPct(t.priceChangePercent, { signed: true }) : "—"}
                </span>
              </a>
            );
          })}
        </div>
      )}

      <div className="mt-3 flex items-center gap-6 text-text-tertiary">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[12px] font-medium transition-colors hover:text-text-primary"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} className="h-[17px] w-[17px]">
            <path d="M14 4h6v6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M20 4 11 13" strokeLinecap="round" />
            <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" strokeLinecap="round" />
          </svg>
          Read
        </a>
        <button
          onClick={share}
          className="flex items-center gap-1.5 text-[12px] font-medium transition-colors hover:text-text-primary"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} className="h-[17px] w-[17px]">
            <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" strokeLinecap="round" />
            <path d="M12 15V4M8 8l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {copied ? "Link copied" : "Share"}
        </button>
      </div>
    </article>
  );
}
