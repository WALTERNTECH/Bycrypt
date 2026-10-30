"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Home", match: (p: string) => p === "/" },
  { href: "/markets", label: "Markets", match: (p: string) => p.startsWith("/markets") },
  { href: "/trade", label: "Trade", match: (p: string) => p.startsWith("/trade") },
  { href: "/investments", label: "Positions", match: (p: string) => p.startsWith("/investments") },
  { href: "/assets", label: "Assets", match: (p: string) => p.startsWith("/assets") },
  { href: "/news", label: "News", match: (p: string) => p.startsWith("/news") }
];

/**
 * The desktop navigation.
 *
 * A tab bar pinned to the bottom of a 27-inch monitor is a phone control
 * that followed the layout onto hardware it was never for. On a wide
 * screen the navigation belongs in the header, beside the mark, where
 * every exchange puts it — so the bottom bar hides at lg and this takes
 * over.
 */
export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-1 lg:flex">
      {items.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-2 text-[14px] transition-colors ${
              active
                ? "font-bold text-text-primary"
                : "font-medium text-text-secondary hover:bg-surface-2 hover:text-text-primary"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
