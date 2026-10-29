import Link from "next/link";

/**
 * The quick-action grid.
 *
 * Four across, two rows, each a circular glyph over a short label — the
 * shape an exchange home screen uses to put its whole feature set one
 * tap away without a menu.
 *
 * Every tile here goes somewhere that exists. The temptation with this
 * layout is to fill all eight slots for symmetry; entries that led
 * nowhere would make the app feel like a mock-up of itself, so the set
 * is exactly what Krypton does.
 */

interface Tile {
  href: string;
  label: string;
  path: React.ReactNode;
  external?: boolean;
}

export function QuickActions({ telegramUrl }: { telegramUrl: string }) {
  const tiles: Tile[] = [
    {
      href: "/trade",
      label: "Trade",
      path: (
        <>
          <path d="M4 17h10M4 17l3-3M4 17l3 3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20 7H10M20 7l-3-3M20 7l-3 3" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )
    },
    {
      href: "/investments",
      label: "Positions",
      path: (
        <>
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" strokeLinecap="round" />
        </>
      )
    },
    {
      href: "/referral",
      label: "Invite Friends",
      path: (
        <>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 19a5.5 5.5 0 0 1 11 0" strokeLinecap="round" />
          <path d="M18 9v6M15 12h6" strokeLinecap="round" />
        </>
      )
    },
    {
      href: "/statement",
      label: "Statement",
      path: (
        <>
          <path d="M6 3h8l4 4v14H6z" strokeLinejoin="round" />
          <path d="M14 3v4h4M9 12h6M9 16h6" strokeLinecap="round" />
        </>
      )
    },
    {
      href: "/deposit",
      label: "Deposit",
      path: (
        <>
          <path d="M12 4v11" strokeLinecap="round" />
          <path d="m8 11 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 19h16" strokeLinecap="round" />
        </>
      )
    },
    {
      href: "/withdraw",
      label: "Withdraw",
      path: (
        <>
          <path d="M12 19V8" strokeLinecap="round" />
          <path d="m8 12 4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 5h16" strokeLinecap="round" />
        </>
      )
    },
    {
      href: "/markets",
      label: "Markets",
      path: (
        <>
          <path d="M4 16.5 9 11l3.5 3.5L20 7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15 7h5v5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )
    },
    {
      href: telegramUrl,
      label: "Support",
      external: true,
      path: (
        <>
          <path d="M21 4 3 11l5 2 2 5 3-4 5 3z" strokeLinejoin="round" />
        </>
      )
    }
  ];

  return (
    <div className="mt-4 grid grid-cols-4 gap-y-4">
      {tiles.map((t) => {
        const inner = (
          <>
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 transition-colors group-hover:bg-surface-3">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.7}
                className="h-[21px] w-[21px] text-text-primary"
              >
                {t.path}
              </svg>
            </span>
            <span className="mt-1.5 text-center text-[11px] font-medium leading-tight text-text-secondary">
              {t.label}
            </span>
          </>
        );

        return t.external ? (
          <a
            key={t.label}
            href={t.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center"
          >
            {inner}
          </a>
        ) : (
          <Link key={t.label} href={t.href} className="group flex flex-col items-center">
            {inner}
          </Link>
        );
      })}
    </div>
  );
}
