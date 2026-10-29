"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The admin navigation.
 *
 * Previously a flat list that became a horizontally scrolling strip of
 * buttons above the content on anything narrower than a desktop — which
 * is how a nine-item nav ends up unusable.
 *
 * It is now grouped and collapsible. Grouping matters more than it
 * sounds: nine flat items is a list you read every time, five groups is
 * a structure you learn once. Overview sits outside the groups because
 * it is where you land and where you return, and a thing you use that
 * often should never be behind a disclosure.
 *
 * Groups open themselves when they contain the current page, so the
 * sidebar always shows where you are without being told.
 */

interface Item {
  href: string;
  label: string;
  badge?: number;
}

interface Group {
  label: string;
  items: Item[];
}

export function AdminSidebar({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const groups: Group[] = [
    {
      label: "Customers",
      items: [
        { href: "/dashboard/users", label: "Users" },
        { href: "/dashboard/notifications", label: "Notifications", badge: unreadCount }
      ]
    },
    {
      label: "Money",
      items: [
        { href: "/dashboard/deposits", label: "Deposits" },
        { href: "/dashboard/withdrawals", label: "Withdrawals" },
        { href: "/dashboard/investments", label: "Investments" }
      ]
    },
    {
      label: "Operations",
      items: [
        { href: "/dashboard/bot-performance", label: "Bot Performance" },
        { href: "/dashboard/audit-logs", label: "Audit Logs" }
      ]
    },
    {
      label: "Settings",
      items: [{ href: "/dashboard/config", label: "Config" }]
    }
  ];

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  const nav = (
    <nav className="flex flex-col gap-0.5 px-3 pb-6">
      <Link
        href="/dashboard"
        onClick={() => setMobileOpen(false)}
        className={`rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors ${
          isActive("/dashboard")
            ? "bg-surface-3 text-text-primary"
            : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
        }`}
      >
        Overview
      </Link>

      {groups.map((group) => (
        <NavGroup
          key={group.label}
          group={group}
          isActive={isActive}
          onNavigate={() => setMobileOpen(false)}
        />
      ))}
    </nav>
  );

  return (
    <>
      {/* Mobile: a bar with a toggle, not a row of nav buttons. */}
      <div className="flex h-14 items-center gap-3 border-b border-border px-4 lg:hidden">
        <button
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Menu"
          aria-expanded={mobileOpen}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-primary"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-[18px] w-[18px]">
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          </svg>
        </button>
        <span className="text-[14px] font-bold text-text-primary">Krypton Admin</span>
      </div>

      {mobileOpen && (
        <>
          <button
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          />
          <div className="fixed inset-y-0 left-0 z-50 w-64 overflow-y-auto border-r border-border bg-base pt-4 lg:hidden">
            {nav}
          </div>
        </>
      )}

      {/* Desktop: always present. */}
      <div className="hidden lg:block">{nav}</div>
    </>
  );
}

function NavGroup({
  group,
  isActive,
  onNavigate
}: {
  group: Group;
  isActive: (href: string) => boolean;
  onNavigate: () => void;
}) {
  const containsCurrent = group.items.some((i) => isActive(i.href));
  const [open, setOpen] = useState(containsCurrent);

  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-text-tertiary transition-colors hover:text-text-secondary"
      >
        {group.label}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          className={`h-3.5 w-3.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="flex flex-col gap-0.5">
          {group.items.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-[13px] transition-colors ${
                  active
                    ? "bg-surface-3 font-semibold text-text-primary"
                    : "font-medium text-text-secondary hover:bg-surface-2 hover:text-text-primary"
                }`}
              >
                {item.label}
                {!!item.badge && (
                  <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-ink">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
