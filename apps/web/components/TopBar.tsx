import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SearchPill } from "./SearchPill";
import { RefreshButton } from "./RefreshButton";
import { DesktopNav } from "./DesktopNav";
import { Logo } from "./Logo";

/**
 * The app header.
 *
 * Laid out the way an exchange lays it out: identity on the left, search
 * taking the middle, and a row of single-purpose icons on the right.
 * Everything here is one tap to somewhere — a header that costs vertical
 * space on a phone has to earn all of it.
 *
 * The avatar is a person glyph, not the first letter of the account name.
 * An initial in a circle reads as a placeholder for a photo that never
 * arrives; the glyph is what Bybit uses and it says "you" without
 * pretending to be anything else.
 */
export async function TopBar() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const [{ data: symbols }, { count: unread }] = await Promise.all([
    supabase.from("market_symbols").select("symbol, display_name").eq("is_active", true).order("sort_order"),
    user
      ? supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_read", false)
      : Promise.resolve({ count: 0 })
  ]);

  return (
    <div className="mx-auto flex h-14 w-full max-w-lg items-center gap-2.5 px-3 sm:px-5 lg:h-16 lg:max-w-[1180px] lg:gap-5 lg:px-6">
      <div className="hidden shrink-0 lg:block">
        <Logo />
      </div>

      <DesktopNav />

      <Link
        href="/account"
        aria-label="Account"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-3 transition-colors hover:bg-[#E4E5EA] lg:order-last"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          className="h-[19px] w-[19px] text-text-primary"
        >
          <circle cx="12" cy="8.2" r="3.6" />
          <path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" strokeLinecap="round" />
        </svg>
      </Link>

      <SearchPill symbols={symbols ?? []} />

      <div className="flex shrink-0 items-center gap-0.5">
        <IconLink href="/deposit" label="Deposit address">
          {/* scan */}
          <path
            d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"
            strokeLinecap="round"
          />
          <path d="M4 12h16" strokeLinecap="round" />
        </IconLink>

        <IconLink href="/referral" label="Invite friends">
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 19a5.5 5.5 0 0 1 11 0" strokeLinecap="round" />
          <path d="M18 9v6M15 12h6" strokeLinecap="round" />
        </IconLink>

        <IconLink href="/notifications" label="Notifications" badge={unread ?? 0}>
          <path d="M6 9a6 6 0 1 1 12 0c0 3.2.9 5 1.6 6H4.4C5.1 14 6 12.2 6 9Z" strokeLinejoin="round" />
          <path d="M10 18.5a2 2 0 0 0 4 0" strokeLinecap="round" />
        </IconLink>

        <RefreshButton />
      </div>
    </div>
  );
}

function IconLink({
  href,
  label,
  badge,
  children
}: {
  href: string;
  label: string;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="relative flex h-9 w-9 items-center justify-center rounded-full text-text-primary transition-colors hover:bg-surface-2"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} className="h-[19px] w-[19px]">
        {children}
      </svg>
      {!!badge && badge > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-negative px-1 text-[9px] font-bold leading-none text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}
