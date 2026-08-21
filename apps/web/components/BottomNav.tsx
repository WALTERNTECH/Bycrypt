"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, MarketsIcon, TradeIcon, DepositIcon } from "./icons";

const items = [
  { href: "/", label: "Home", icon: HomeIcon, match: (p: string) => p === "/" },
  { href: "/markets", label: "Markets", icon: MarketsIcon, match: (p: string) => p.startsWith("/markets") },
  { href: "/trade", label: "Trade", icon: TradeIcon, match: (p: string) => p.startsWith("/trade") },
  { href: "/deposit", label: "Deposit", icon: DepositIcon, match: (p: string) => p.startsWith("/deposit") }
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-panel/95 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {items.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors"
            >
              <Icon className={`h-5 w-5 ${active ? "text-brand" : "text-text-secondary"}`} />
              <span className={active ? "text-brand" : "text-text-secondary"}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
