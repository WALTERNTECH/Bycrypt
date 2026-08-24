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

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg">
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
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
              {/* active top rail */}
              <span
                className={`absolute inset-x-4 top-0 h-0.5 rounded-full transition-opacity ${
                  active ? "bg-brand opacity-100" : "opacity-0"
                }`}
              />
              <Icon className={`h-[19px] w-[19px] ${active ? "text-brand" : "text-text-tertiary"}`} />
              <span className={`text-[10px] font-bold ${active ? "text-brand" : "text-text-tertiary"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
