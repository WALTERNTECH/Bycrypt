import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LiveBalanceCard } from "@/components/LiveBalanceCard";
import { PositionChart } from "@/components/PositionChart";
import { formatUsdt } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Assets.
 *
 * The tab people open to answer one question: what am I worth right now.
 * It reuses the same total-assets block as the home screen deliberately
 * — a second, differently-shaped view of the same number is how two
 * screens end up disagreeing.
 *
 * Below it, the open position valued live, and the referral balance,
 * which is real money the account holds but cannot be traded until it is
 * moved across.
 */
export default async function AssetsPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: investments }, { data: symbols }] = await Promise.all([
    supabase.from("profiles").select("wallet_balance, referral_balance").eq("id", user!.id).single(),
    supabase
      .from("investments")
      .select("id, amount, accrued_return, traded_symbol, status, entry_price, start_date")
      .eq("user_id", user!.id)
      .neq("status", "withdrawn")
      .order("created_at", { ascending: false }),
    supabase.from("market_symbols").select("symbol, display_name").eq("is_active", true).order("sort_order")
  ]);

  const open = (investments ?? []).map((i) => ({
    id: i.id as string,
    amount: parseFloat(String(i.amount)),
    accrued: parseFloat(String(i.accrued_return)),
    traded_symbol: i.traded_symbol as string | null,
    entry_price:
      i.entry_price === null || i.entry_price === undefined ? null : parseFloat(String(i.entry_price)),
    start_date: i.start_date as string
  }));

  const walletBalance = parseFloat(String(profile?.wallet_balance ?? 0));
  const referralBalance = parseFloat(String(profile?.referral_balance ?? 0));
  const position = open[0];

  return (
    <div className="px-4 pt-4 sm:px-6">
      <LiveBalanceCard
        walletBalance={walletBalance}
        investments={open.map((p) => ({
          amount: p.amount,
          accrued: p.accrued,
          traded_symbol: p.traded_symbol
        }))}
      />

      {position?.traded_symbol ? (
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
      ) : (
        <div className="mt-3 rounded-xl border border-border bg-surface px-4 py-8 text-center">
          <p className="text-[13px] font-semibold text-text-primary">No open position</p>
          <p className="mt-1 text-[12px] text-text-secondary">
            Fund your wallet and open one to see it valued here.
          </p>
          <Link
            href="/trade"
            className="mt-3 inline-block rounded-lg bg-brand px-4 py-2 text-[13px] font-semibold text-ink"
          >
            Go to Trade
          </Link>
        </div>
      )}

      <div className="mt-3 overflow-hidden rounded-xl border border-border bg-surface">
        <Row label="Wallet" value={formatUsdt(walletBalance, { withSymbol: true })} href="/withdraw" action="Withdraw" />
        <Row
          label="Referral earnings"
          value={formatUsdt(referralBalance, { withSymbol: true })}
          href="/referral"
          action={referralBalance > 0 ? "Move to wallet" : "Invite"}
        />
        <Row label="Statement" value="This month" href="/statement" action="View" />
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  href,
  action
}: {
  label: string;
  value: string;
  href: string;
  action: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-text-secondary">{label}</p>
        <p className="mono-num mt-0.5 text-[15px] font-bold text-text-primary">{value}</p>
      </div>
      <Link
        href={href}
        className="shrink-0 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-[12px] font-semibold text-text-primary transition-colors hover:bg-surface-3"
      >
        {action}
      </Link>
    </div>
  );
}
