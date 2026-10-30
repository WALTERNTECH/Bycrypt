import Link from "next/link";
import { NewsFeed } from "./NewsFeed";
import { fetchNews } from "@/lib/news";

/**
 * What sits at the bottom of a screen that would otherwise stop dead.
 *
 * Markets ended at the last coin, Positions at the last row, and under
 * each was a risk notice and then nothing — which reads as the end of the
 * app rather than the end of a list.
 *
 * Two things fill it, and both are real. A short row of routes that
 * follow naturally from the screen you are on, chosen per page rather
 * than a generic menu repeated everywhere. Then the market feed, which
 * keeps loading as you scroll, so no screen has a bottom to reach.
 *
 * Nothing here is invented to fill space: every link goes somewhere this
 * app does, and every story is one a desk actually published.
 */

type Variant = "markets" | "positions" | "trade" | "assets";

interface Shortcut {
  href: string;
  label: string;
  caption: string;
}

const SHORTCUTS: Record<Variant, Shortcut[]> = {
  markets: [
    { href: "/trade", label: "Trade", caption: "Open a position" },
    { href: "/investments", label: "Positions", caption: "What's running" },
    { href: "/deposit", label: "Deposit", caption: "Fund your wallet" },
    { href: "/assets", label: "Assets", caption: "What you hold" }
  ],
  positions: [
    { href: "/trade", label: "Trade", caption: "Open another" },
    { href: "/markets", label: "Markets", caption: "Find a market" },
    { href: "/statement", label: "Statement", caption: "Download a report" },
    { href: "/assets", label: "Assets", caption: "What you hold" }
  ],
  trade: [
    { href: "/investments", label: "Positions", caption: "What's running" },
    { href: "/markets", label: "Markets", caption: "All markets" },
    { href: "/assets", label: "Assets", caption: "What you hold" },
    { href: "/statement", label: "Statement", caption: "Download a report" }
  ],
  assets: [
    { href: "/deposit", label: "Deposit", caption: "Fund your wallet" },
    { href: "/withdraw", label: "Withdraw", caption: "Take funds out" },
    { href: "/trade", label: "Trade", caption: "Open a position" },
    { href: "/statement", label: "Statement", caption: "Download a report" }
  ]
};

const FEED_HEADING: Record<Variant, string> = {
  markets: "Market news",
  positions: "What's moving",
  trade: "Market news",
  assets: "Market news"
};

export async function PageTail({ variant }: { variant: Variant }) {
  // A failing feed must not take the page down with it — the shortcuts
  // still render and the section simply ends earlier.
  const news = await fetchNews().catch(() => []);

  return (
    <>
      <section className="mt-8">
        <h2 className="text-[13px] font-bold text-text-primary">Next</h2>
        <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {SHORTCUTS[variant].map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="group rounded-lg bg-surface-2 px-3.5 py-3 transition-colors hover:bg-surface-3"
            >
              <span className="flex items-center gap-1 text-[13px] font-bold text-text-primary">
                {s.label}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.4}
                  className="h-3 w-3 text-text-tertiary transition-transform group-hover:translate-x-0.5"
                >
                  <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="mt-0.5 block text-[11px] text-text-tertiary">{s.caption}</span>
            </Link>
          ))}
        </div>
      </section>

      {news.length > 0 && (
        <section className="mt-7">
          <h2 className="text-[13px] font-bold text-text-primary">{FEED_HEADING[variant]}</h2>
          <NewsFeed
            initialItems={news.slice(0, 8)}
            initialNextPage={news.length > 8 ? 2 : null}
            showTabs={false}
          />
        </section>
      )}
    </>
  );
}
