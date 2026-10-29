import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PositionChart } from "@/components/PositionChart";
import { LiveBalanceCard } from "@/components/LiveBalanceCard";
import { OpenPositionCard } from "@/components/OpenPositionCard";
import { QuickActions } from "@/components/QuickActions";
import { MarketHighlights } from "@/components/MarketHighlights";
import { MarketBoard } from "@/components/MarketBoard";
import { TickerStrip } from "@/components/TickerStrip";
import { mapPositionRow, POSITION_COLUMNS } from "@/lib/position";

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: investments }, { data: symbols }, { data: supportCfg }] =
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
      supabase.from("platform_config").select("value").eq("key", "telegram_support_url").maybeSingle()
    ]);

  const positions = (investments ?? []).map(mapPositionRow);
  const telegramUrl = supportCfg?.value ?? "https://t.me/KRYPTONinv";
  const walletBalance = parseFloat(String(profile?.wallet_balance ?? 0));
  const position = positions[0];
  const displayName =
    position?.symbol
      ? ((symbols ?? []).find((m) => m.symbol === position.symbol)?.display_name ??
        position.symbol.replace("USDT", ""))
      : "";

  return (
    <div className="px-4 pt-4 sm:px-6">
      <LiveBalanceCard walletBalance={walletBalance} positions={positions} />

      <QuickActions telegramUrl={telegramUrl} />

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

      <Link
        href="/investments"
        className="mt-5 flex items-center justify-center gap-1.5 rounded-lg bg-surface-2 py-3 text-xs font-bold text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary"
      >
        Position history
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}
