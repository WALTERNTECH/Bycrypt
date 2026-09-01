"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, MarketsIcon, TradeIcon, PortfolioIcon, DepositIcon } from "./icons";

const items = [
  { href: "/", label: "Home", icon: HomeIcon, match: (p: string) => p === "/" },
  { href: "/markets", label: "Markets", icon: MarketsIcon, match: (p: string) => p.startsWith("/markets") },
  { href: "/trade", label: "Trade", icon: TradeIcon, match: (p: string) => p.startsWith("/trade") },
  { href: "/investments", label: "Positions", icon: PortfolioIcon, match: (p: string) => p.startsWith("/investments") },
  { href: "/deposit", label: "Deposit", icon: DepositIcon, match: (p: string) => p.startsWith("/deposit") }
];

/**
 * White tab bar, matching the header — the app chrome is light at both
 * ends and the trading surface sits between them.
 *
 * On a light bar the active state can't lean on the brand accent alone:
 * yellow on white is close to illegible. So the selected tab gets a
 * tinted pill and darker, heavier text, and the accent colour is carried
 * by the rail above it where it has a white field to sit against.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-header-border bg-header pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_0_rgba(0,0,0,0.04),0_-8px_24px_-12px_rgba(0,0,0,0.18)]">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1">
        {items.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className="relative flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors"
            >
              <span
                className={`absolute inset-x-3 top-0 h-[3px] rounded-full transition-opacity ${
                  active ? "bg-brand opacity-100" : "opacity-0"
                }`}
              />
              <span
                className={`flex h-8 w-full max-w-[56px] items-center justify-center rounded-lg transition-colors ${
                  active ? "bg-header-3" : ""
                }`}
              >
                <Icon className={`h-[19px] w-[19px] ${active ? "text-header-text" : "text-header-muted"}`} />
              </span>
              <span className={`text-[10px] font-bold ${active ? "text-header-text" : "text-header-muted"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
