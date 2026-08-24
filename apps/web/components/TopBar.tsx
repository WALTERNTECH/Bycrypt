import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TelegramButton } from "./TelegramButton";
import { KycBadge } from "./KycBadge";
import { Logo } from "./Logo";

export async function TopBar() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: config }] = await Promise.all([
    user
      ? supabase.from("profiles").select("full_name, kyc_status").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("platform_config").select("value").eq("key", "telegram_support_url").maybeSingle()
  ]);

  const telegramUrl = config?.value ?? "https://t.me/KRYPTONinv";
  const initial = (profile?.full_name || user?.email || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="flex h-14 items-center justify-between border-b border-border/60 px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <Link
          href="/account"
          aria-label="Account settings"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-extrabold text-base shadow-md shadow-brand/30 ring-1 ring-white/10 transition-transform hover:scale-105 active:scale-95"
        >
          {initial}
        </Link>
        <Link href="/" className="hidden sm:block">
          <Logo />
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <KycBadge status={profile?.kyc_status ?? "unverified"} />
        <TelegramButton url={telegramUrl} />
      </div>
    </div>
  );
}
