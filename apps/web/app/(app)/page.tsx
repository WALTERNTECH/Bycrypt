import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CoinGrid } from "@/components/CoinGrid";
import { PositionChart } from "@/components/PositionChart";
import { LiveBalanceCard } from "@/components/LiveBalanceCard";
import { OpenPositionCard } from "@/components/OpenPositionCard";
import { SectionHeading } from "@/components/ui";
import { QuickActions } from "@/components/QuickActions";
import { MarketHighlights } from "@/components/MarketHighlights";
import { TickerStrip } from "@/components/TickerStrip";

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: investments }, { data: symbols }, { data: supportCfg }] = await Promise.all([
    supabase.from("profiles").select("wallet_balance").eq("id", user!.id).single(),
    supabase
      .from("investments")
      .select("id, amount, accrued_return, traded_symbol, status, entry_price, start_date")
      .eq("user_id", user!.id)
      .neq("status", "withdrawn")
      .order("created_at", { ascending: false }),
    supabase.from("market_symbols").select("symbol, display_name").eq("is_active", true).order("sort_order"),
    supabase.from("platform_config").select("value").eq("key", "telegram_support_url").maybeSingle()
  ]);

  const openPositions = (investments ?? []).map((i) => ({
    id: i.id as string,
    amount: parseFloat(String(i.amount)),
    accrued: parseFloat(String(i.accrued_return)),
    traded_symbol: i.traded_symbol as string | null,
    entry_price: i.entry_price === null || i.entry_price === undefined ? null : parseFloat(String(i.entry_price)),
    start_date: i.start_date as string
  }));
  const telegramUrl = supportCfg?.value ?? "https://t.me/KRYPTONinv";
  const walletBalance = parseFloat(String(profile?.wallet_balance ?? 0));
  const position = openPositions[0];

  return (
    <div className="px-4 pt-4 sm:px-6">
      <LiveBalanceCard
        walletBalance={walletBalance}
        investments={openPositions.map((p) => ({ amount: p.amount, accrued: p.accrued, traded_symbol: p.traded_symbol }))}
      />

      <QuickActions telegramUrl={telegramUrl} />

      <MarketHighlights rows={symbols ?? []} />

      {/* The chart answers "how is my money doing" and so comes first;
          the position card below it carries the detail and the close
          control. Both only exist when there is a position. */}
      {position?.traded_symbol && (
        <PositionChart
          symbol={position.traded_symbol}
          displayName={
            (symbols ?? []).find((m) => m.symbol === position.traded_symbol)?.display_name ??
            position.traded_symbol.replace("USDT", "")
          }
          principal={position.amount}
          entryPrice={position.entry_price}
          startedAt={position.start_date}
        />
      )}

      {position && (
        <OpenPositionCard
          id={position.id}
          symbol={position.traded_symbol}
          principal={position.amount}
          accrued={position.accrued}
        />
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-surface">
        <TickerStrip rows={symbols ?? []} />
      </div>

      <div className="mt-6">
        <SectionHeading
          title="Markets"
          action={
            <Link href="/markets" className="text-xs font-bold text-brand transition-colors hover:text-brand-hover">
              See all
            </Link>
          }
        />
        <CoinGrid rows={symbols ?? []} />
      </div>

      <Link
        href="/investments"
        className="mt-5 flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface py-3 text-xs font-bold text-text-secondary shadow-card transition-colors hover:border-border-strong hover:text-text-primary"
      >
        Position history
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}

