import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TelegramButton } from "./TelegramButton";
import { Logo } from "./Logo";

export async function TopBar() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: config }] = await Promise.all([
    user
      ? supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("platform_config").select("value").eq("key", "telegram_support_url").maybeSingle()
  ]);

  const telegramUrl = config?.value ?? "https://t.me/KRYPTONinv";
  const name = (profile?.full_name || user?.email || "").trim();
  const initial = (name || "?").charAt(0).toUpperCase();
  const firstName = name.split(/[\s@]/)[0] || "Account";

  return (
    <div className="flex h-16 items-center justify-between gap-2 bg-header px-3 sm:px-5">
      {/* Identity — a real, tappable control, not a letter floating on the bar */}
      <Link
        href="/account"
        aria-label="Account settings"
        className="flex min-w-0 items-center gap-2.5 rounded-full border border-header-border bg-header-2 py-1 pl-1 pr-3 shadow-sm transition-all duration-150 hover:bg-header-3 active:translate-y-px active:shadow-none"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-header-dark text-sm font-extrabold text-white shadow-sm">
          {initial}
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-[13px] font-bold text-header-text">{firstName}</span>
          <span className="text-[10px] font-medium text-header-muted">View account</span>
        </span>
      </Link>

      {/* Wordmark sits centre-right now that the verification chip is gone,
          so the bar doesn't read as a control with a gap beside it. */}
      <Link href="/" aria-label="Home" className="hidden sm:block">
        <Logo />
      </Link>

      <div className="flex shrink-0 items-center gap-2">
        <TelegramButton url={telegramUrl} />
      </div>
    </div>
  );
}
