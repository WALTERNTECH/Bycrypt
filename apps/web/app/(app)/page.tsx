import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CoinGrid } from "@/components/CoinGrid";
import { CoinSuggestion } from "@/components/CoinSuggestion";
import { LiveBalanceCard } from "@/components/LiveBalanceCard";

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

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link
          href="/trade"
          className="rounded-lg bg-brand py-2.5 text-center text-sm font-bold text-base transition-colors hover:bg-brand-hover"
        >
          Trade
        </Link>
        <Link
          href="/deposit"
          className="rounded-lg border border-border py-2.5 text-center text-sm font-bold text-text-primary transition-colors hover:bg-panel"
        >
          Deposit
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
