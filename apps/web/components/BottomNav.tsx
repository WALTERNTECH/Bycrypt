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
 * The tab bar.
 *
 * Deliberately plain: a hairline top border, white fill, and nothing
 * else. The previous version carried a tinted pill and a coloured rail
 * per tab, which is what made it read as decorated rather than designed.
 *
 * Selection is shown the way an exchange shows it — the active tab goes
 * near-black and heavier, the rest stay grey. On a white interface that
 * contrast is stronger than any accent colour, and it leaves the amber
 * free to mean "this is the action" everywhere else in the app.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-base pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {items.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className="flex flex-1 flex-col items-center gap-1 py-2 transition-colors"
            >
              <Icon
                className={`h-[20px] w-[20px] ${active ? "text-text-primary" : "text-text-tertiary"}`}
              />
              <span
                className={`text-[10px] leading-none ${
                  active ? "font-semibold text-text-primary" : "font-medium text-text-tertiary"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
