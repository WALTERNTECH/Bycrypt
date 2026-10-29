import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LiveBalanceCard } from "@/components/LiveBalanceCard";
import { PositionChart } from "@/components/PositionChart";
import { OpenPositionCard } from "@/components/OpenPositionCard";
import { formatUsdt } from "@/lib/format";
import { mapPositionRow, POSITION_COLUMNS } from "@/lib/position";

export const dynamic = "force-dynamic";

/**
 * Assets.
 *
 * The tab people open to answer one question: what am I worth right now.
 * It reuses the same total-assets block as the home screen deliberately —
 * a second, differently-shaped view of the same number is how two screens
 * end up disagreeing.
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
      .select(POSITION_COLUMNS)
      .eq("user_id", user!.id)
      .neq("status", "withdrawn")
      .order("created_at", { ascending: false }),
    supabase
      .from("market_symbols")
      .select("symbol, display_name")
      .eq("is_active", true)
      .order("sort_order")
  ]);

  const positions = (investments ?? []).map(mapPositionRow);
  const walletBalance = parseFloat(String(profile?.wallet_balance ?? 0));
  const referralBalance = parseFloat(String(profile?.referral_balance ?? 0));
  const position = positions[0];
  const displayName = position?.symbol
    ? ((symbols ?? []).find((m) => m.symbol === position.symbol)?.display_name ??
      position.symbol.replace("USDT", ""))
    : "";

  return (
    <div className="px-4 pt-4 sm:px-6">
      <LiveBalanceCard walletBalance={walletBalance} positions={positions} />

      {position?.symbol ? (
        <>
          <PositionChart row={position} displayName={displayName} />
          <OpenPositionCard row={position} />
        </>
      ) : (
        <div className="mt-5 rounded-lg bg-surface-2 px-4 py-8 text-center">
          <p className="text-[13px] font-bold text-text-primary">No open position</p>
          <p className="mt-1 text-[12px] text-text-secondary">
            Fund your wallet and open one to see it valued here.
          </p>
          <Link
            href="/trade"
            className="mt-3 inline-flex h-9 items-center rounded-lg bg-brand px-4 text-[13px] font-bold text-ink"
          >
            Go to Trade
          </Link>
        </div>
      )}

      <div className="mt-5">
        <Row
          label="Wallet"
          value={formatUsdt(walletBalance, { withSymbol: true })}
          href="/withdraw"
          action="Withdraw"
        />
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
    <div className="flex items-center justify-between py-3">
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-text-secondary">{label}</p>
        <p className="mono-num mt-0.5 text-[15px] font-bold text-text-primary">{value}</p>
      </div>
      <Link
        href={href}
        className="flex h-8 shrink-0 items-center rounded-lg bg-surface-2 px-3 text-[12px] font-semibold text-text-primary transition-colors hover:bg-surface-3"
      >
        {action}
      </Link>
    </div>
  );
}
