"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, MarketsIcon, TradeIcon, PortfolioIcon, AssetsIcon } from "./icons";

const items = [
  { href: "/", label: "Home", icon: HomeIcon, match: (p: string) => p === "/" },
  { href: "/markets", label: "Markets", icon: MarketsIcon, match: (p: string) => p.startsWith("/markets") },
  { href: "/trade", label: "Trade", icon: TradeIcon, match: (p: string) => p.startsWith("/trade") },
  {
    href: "/investments",
    label: "Positions",
    icon: PortfolioIcon,
    match: (p: string) => p.startsWith("/investments")
  },
  // Assets replaces Deposit here: depositing is one action and already
  // sits on the home screen twice, while "what am I worth" is a place
  // people return to.
  { href: "/assets", label: "Assets", icon: AssetsIcon, match: (p: string) => p.startsWith("/assets") }
];

/**
 * The tab bar.
 *
 * A light panel lifted off the page, with the selected tab sitting in its
 * own near-black frame. That pairing — light bar, dark framed selection —
 * is what gives an exchange footer its weight: the frame is a physical
 * thing you have moved to, rather than a coloured icon among grey ones.
 *
 * It also leaves the amber free to mean "this is the action" everywhere
 * else in the app, which it cannot do if the footer is using it too.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 bg-surface-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_0_rgba(18,18,20,0.06),0_-8px_24px_-18px_rgba(18,18,20,0.25)]">
      <div className="mx-auto flex max-w-lg items-stretch gap-1 px-2 py-1.5">
        {items.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 transition-colors ${
                active ? "bg-[#17181C]" : "hover:bg-surface-3"
              }`}
            >
              <Icon className={`h-[19px] w-[19px] ${active ? "text-white" : "text-text-tertiary"}`} />
              <span
                className={`text-[10px] leading-none ${
                  active ? "font-bold text-white" : "font-medium text-text-tertiary"
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
