import { createClient } from "@/lib/supabase/server";
import { PositionChart } from "@/components/PositionChart";
import { LiveBalanceCard } from "@/components/LiveBalanceCard";
import { OpenPositionCard } from "@/components/OpenPositionCard";
import { QuickActions } from "@/components/QuickActions";
import { PromoCarousel } from "@/components/PromoCarousel";
import { MarketHighlights } from "@/components/MarketHighlights";
import { MarketBoard } from "@/components/MarketBoard";
import { TickerStrip } from "@/components/TickerStrip";
import { NewsFeed } from "@/components/NewsFeed";
import { mapPositionRow, POSITION_COLUMNS } from "@/lib/position";
import { defaultPromos, parsePromos } from "@/lib/promos";
import { fetchNews } from "@/lib/news";

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: investments }, { data: symbols }, { data: config }, news] =
    await Promise.all([
      supabase.from("profiles").select("wallet_balance").eq("id", user!.id).single(),
      supabase
        .from("investments")
        .select(POSITION_COLUMNS)
        .eq("user_id", user!.id)
        .neq("status", "withdrawn")
        .order("created_at", { ascending: false }),
      supabase
        .from("market_symbols")
        .select("symbol, display_name")
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("platform_config")
        .select("key, value")
        .in("key", ["telegram_support_url", "referral_bonus_usd", "home_promos"]),
      // The feed is the bottom of this screen, so its first page is
      // rendered with it rather than fetched after paint.
      fetchNews().catch(() => [])
    ]);

  const cfg = Object.fromEntries((config ?? []).map((c) => [c.key, c.value]));
  const telegramUrl = cfg.telegram_support_url ?? "https://t.me/KRYPTONinv";
  const referralBonus = parseFloat(cfg.referral_bonus_usd ?? "500");
  const promos = parsePromos(cfg.home_promos) ?? defaultPromos(referralBonus, telegramUrl);

  const positions = (investments ?? []).map(mapPositionRow);
  const walletBalance = parseFloat(String(profile?.wallet_balance ?? 0));
  const position = positions[0];
  const displayName = position?.symbol
    ? ((symbols ?? []).find((m) => m.symbol === position.symbol)?.display_name ??
      position.symbol.replace("USDT", ""))
    : "";

  return (
    <div className="px-4 pt-4 sm:px-6">
      <LiveBalanceCard walletBalance={walletBalance} positions={positions} />

      <QuickActions telegramUrl={telegramUrl} />

      <PromoCarousel slides={promos} />

      {/* The chart answers "how is my money doing" and so comes first; the
          card below it carries the exit. Both only exist when there is a
          position. */}
      {position?.symbol && <PositionChart row={position} displayName={displayName} />}
      {position && <OpenPositionCard row={position} />}

      <MarketHighlights rows={symbols ?? []} />

      <div className="mt-5 overflow-hidden rounded-lg">
        <TickerStrip rows={symbols ?? []} />
      </div>

      <MarketBoard rows={symbols ?? []} />

      {/* The feed runs to the bottom of the screen and keeps going. It
          replaced a position-history button and a risk notice, neither of
          which gave anyone a reason to stay here — position history now
          lives on the Positions tab, where someone goes looking for it,
          and the risk notice sits on the screens where risk is actually
          taken rather than on the one people open to check a balance. */}
      <NewsFeed
        initialItems={news.slice(0, 12)}
        initialNextPage={news.length > 12 ? 2 : null}
      />
    </div>
  );
}
