import { createClient } from "@/lib/supabase/server";
import { Logo } from "./Logo";
import { TelegramButton } from "./TelegramButton";

export async function Footer() {
  const supabase = createClient();
  const { data: config } = await supabase
    .from("platform_config")
    .select("value")
    .eq("key", "telegram_support_url")
    .maybeSingle();
  const telegramUrl = config?.value ?? "https://t.me/KRYPTONinv";

  return (
    <footer className="border-t border-border/60 bg-base">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              Krypton allocates deposited USDT into automated, professionally managed trading.
              Returns are variable and capped by tier — never guaranteed.
            </p>
            <div className="mt-4">
              <TelegramButton url={telegramUrl} variant="full" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
            <div>
              <p className="mb-3 font-semibold text-text-primary">Product</p>
              <ul className="space-y-2 text-text-secondary">
                <li><a href="/markets" className="hover:text-text-primary">Markets</a></li>
                <li><a href="/#tiers" className="hover:text-text-primary">Investment tiers</a></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 font-semibold text-text-primary">Account</p>
              <ul className="space-y-2 text-text-secondary">
                <li><a href="/login" className="hover:text-text-primary">Log in</a></li>
                <li><a href="/signup" className="hover:text-text-primary">Sign up</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-10 border-t border-border/60 pt-6 text-xs leading-relaxed text-text-secondary">
          <p>
            Returns are variable, market-dependent maximums — not guarantees, and may be lower
            than the cap, including zero, if the market does not move favourably. Krypton does
            not custody funds long-term and does not provide investment advice. Digital asset
            markets carry significant risk; only invest what you can afford to lose.
          </p>
          <p className="mt-3">© {new Date().getFullYear()} Krypton. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
