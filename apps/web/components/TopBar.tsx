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
  const initial = (profile?.full_name || user?.email || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="flex h-14 items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <Link
          href="/account"
          aria-label="Account settings"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-panel-2 text-sm font-bold text-brand ring-1 ring-border/60 transition-colors hover:ring-brand"
        >
          {initial}
        </Link>
        <Link href="/" className="hidden sm:block">
          <Logo />
        </Link>
      </div>
      <TelegramButton url={telegramUrl} />
    </div>
  );
}
