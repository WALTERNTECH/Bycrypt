import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CoinGrid } from "@/components/CoinGrid";
import { CoinSuggestion } from "@/components/CoinSuggestion";
import { LiveBalanceCard } from "@/components/LiveBalanceCard";
import { OpenPositionCard } from "@/components/OpenPositionCard";
import { SectionHeading } from "@/components/ui";
import { TradeIcon, DepositIcon, WithdrawIcon } from "@/components/icons";

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: investments }, { data: symbols }] = await Promise.all([
    supabase.from("profiles").select("wallet_balance").eq("id", user!.id).single(),
    supabase
      .from("investments")
      .select("id, amount, accrued_return, traded_symbol, status")
      .eq("user_id", user!.id)
      .neq("status", "withdrawn")
      .order("created_at", { ascending: false }),
    supabase.from("market_symbols").select("symbol, display_name").eq("is_active", true).order("sort_order")
  ]);

  const openPositions = (investments ?? []).map((i) => ({
    id: i.id as string,
    amount: parseFloat(String(i.amount)),
    accrued: parseFloat(String(i.accrued_return)),
    traded_symbol: i.traded_symbol as string | null
  }));
  const walletBalance = parseFloat(String(profile?.wallet_balance ?? 0));
  const position = openPositions[0];

  return (
    <div className="px-4 pt-4 sm:px-6">
      <LiveBalanceCard
        walletBalance={walletBalance}
        investments={openPositions.map((p) => ({ amount: p.amount, accrued: p.accrued, traded_symbol: p.traded_symbol }))}
      />

      <div className="mt-3 grid grid-cols-3 gap-2.5">
        <ActionTile href="/trade" tone="brand" label="Trade" icon={<TradeIcon className="h-[18px] w-[18px]" />} />
        <ActionTile href="/deposit" tone="positive" label="Deposit" icon={<DepositIcon className="h-[18px] w-[18px]" />} />
        <ActionTile href="/withdraw" tone="neutral" label="Withdraw" icon={<WithdrawIcon className="h-[18px] w-[18px]" />} />
      </div>

      {position && (
        <OpenPositionCard
          id={position.id}
          symbol={position.traded_symbol}
          principal={position.amount}
          accrued={position.accrued}
        />
      )}

      {/* Shown in both states: with nothing open the call is a buy, with a
          position open it watches that coin and turns into a sell. */}
      <CoinSuggestion rows={symbols ?? []} heldSymbol={position?.traded_symbol ?? null} />

      <div className="mt-7">
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

// Primary actions read as three distinct, tappable tiles — the gold one
// is the primary path, the other two are quieter so the row has a clear
// visual hierarchy instead of three competing bright blocks.
function ActionTile({
  href,
  label,
  icon,
  tone
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  tone: "brand" | "positive" | "neutral";
}) {
  const tones = {
    brand:
      "bg-gradient-to-b from-brand-hover to-brand text-ink border-[#C9990A] shadow-btn-brand hover:from-[#FFD84D] hover:to-[#F7C21A]",
    positive:
      "bg-gradient-to-b from-surface-3 to-surface-2 text-positive border-border-strong shadow-btn hover:border-positive/50",
    neutral:
      "bg-gradient-to-b from-surface-3 to-surface-2 text-text-primary border-border-strong shadow-btn hover:border-border-strong"
  };
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border py-3.5 transition-all duration-150 active:translate-y-px active:shadow-none ${tones[tone]}`}
    >
      {icon}
      <span className="text-xs font-bold">{label}</span>
    </Link>
  );
}
