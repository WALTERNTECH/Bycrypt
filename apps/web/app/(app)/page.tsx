import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CoinGrid } from "@/components/CoinGrid";
import { formatUsdt } from "@/lib/format";

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: investments }, { data: symbols }] = await Promise.all([
    supabase.from("profiles").select("wallet_balance").eq("id", user!.id).single(),
    supabase.from("investments").select("amount, accrued_return, status").eq("user_id", user!.id),
    supabase.from("market_symbols").select("symbol, display_name").eq("is_active", true).order("sort_order")
  ]);

  const active = (investments ?? []).filter((i) => i.status !== "withdrawn");
  const principal = active.reduce((sum, i) => sum + parseFloat(String(i.amount)), 0);
  const accrued = active.reduce((sum, i) => sum + parseFloat(String(i.accrued_return)), 0);
  const walletBalance = parseFloat(String(profile?.wallet_balance ?? 0));
  const totalEquity = walletBalance + principal + accrued;

  return (
    <div className="px-4 pt-5 sm:px-6">
      {/* Balance */}
      <div>
        <p className="text-xs font-medium text-text-secondary">Estimated balance</p>
        <p className="mono-num mt-1 text-3xl font-extrabold text-text-primary">
          {formatUsdt(totalEquity, { withSymbol: true })}
        </p>
        <div className="mt-2 flex items-center gap-4 text-xs">
          <span className="text-text-secondary">
            Wallet: <span className="mono-num font-semibold text-text-primary">{formatUsdt(walletBalance, { withSymbol: true })}</span>
          </span>
          <span className="text-text-secondary">
            Invested: <span className="mono-num font-semibold text-text-primary">{formatUsdt(principal, { withSymbol: true })}</span>
          </span>
          <span className="text-positive">
            +{formatUsdt(accrued, { withSymbol: true })}
          </span>
        </div>
      </div>

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
