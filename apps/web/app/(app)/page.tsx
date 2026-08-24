import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CoinGrid } from "@/components/CoinGrid";
import { CoinSuggestion } from "@/components/CoinSuggestion";
import { LiveBalanceCard } from "@/components/LiveBalanceCard";
import { TradeIcon, DepositIcon, WithdrawIcon } from "@/components/icons";

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: investments }, { data: symbols }] = await Promise.all([
    supabase.from("profiles").select("wallet_balance").eq("id", user!.id).single(),
    supabase.from("investments").select("amount, traded_symbol, status").eq("user_id", user!.id).neq("status", "withdrawn"),
    supabase.from("market_symbols").select("symbol, display_name").eq("is_active", true).order("sort_order")
  ]);

  const liveInvestments = (investments ?? []).map((i) => ({
    amount: parseFloat(String(i.amount)),
    traded_symbol: i.traded_symbol
  }));
  const walletBalance = parseFloat(String(profile?.wallet_balance ?? 0));

  return (
    <div className="px-4 pt-5 sm:px-6">
      <LiveBalanceCard walletBalance={walletBalance} investments={liveInvestments} />

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Link
          href="/trade"
          className="flex flex-col items-center gap-1.5 rounded-xl bg-brand py-3 text-center shadow-md shadow-brand/25 ring-1 ring-white/10 transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <TradeIcon className="h-5 w-5 text-base" />
          <span className="text-sm font-bold text-base">Trade</span>
        </Link>
        <Link
          href="/deposit"
          className="flex flex-col items-center gap-1.5 rounded-xl border border-positive/40 bg-positive/[0.08] py-3 text-center transition-colors hover:bg-positive/[0.14]"
        >
          <DepositIcon className="h-5 w-5 text-positive" />
          <span className="text-sm font-bold text-positive">Deposit</span>
        </Link>
        <Link
          href="/withdraw"
          className="flex flex-col items-center gap-1.5 rounded-xl border border-negative/40 bg-negative/[0.08] py-3 text-center transition-colors hover:bg-negative/[0.14]"
        >
          <WithdrawIcon className="h-5 w-5 text-negative" />
          <span className="text-sm font-bold text-negative">Withdraw</span>
        </Link>
      </div>

      <Link href="/investments" className="mt-3 block text-center text-xs font-medium text-text-secondary hover:text-brand">
        View your investments →
      </Link>

      <CoinSuggestion rows={symbols ?? []} />

      {/* Markets */}
      <div className="mt-7">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-text-primary">Markets</p>
          <Link href="/markets" className="text-xs font-medium text-brand">
            See all
          </Link>
        </div>
        <CoinGrid rows={symbols ?? []} />
      </div>
    </div>
  );
}
