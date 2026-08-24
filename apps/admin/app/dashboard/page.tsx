import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/StatCard";
import { formatUsdt, formatDateTime } from "@/lib/format";

export default async function AdminOverviewPage() {
  const supabase = createClient();

  const [
    { count: userCount },
    { count: pendingDepositCount },
    { count: pendingWithdrawalCount },
    { count: pendingKycCount },
    { data: activeInvestments },
    { data: latestBotLog }
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("deposits").select("*", { count: "exact", head: true }).eq("status", "pending_verification"),
    supabase.from("withdrawals").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("kyc_submissions").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("investments").select("amount, accrued_return").in("status", ["active", "matured"]),
    supabase.from("bot_performance_logs").select("*").order("log_date", { ascending: false }).limit(1).maybeSingle()
  ]);

  const totalLiability = (activeInvestments ?? []).reduce(
    (sum, i) => sum + parseFloat(String(i.amount)) + parseFloat(String(i.accrued_return)),
    0
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary">Overview</h1>
      <p className="mt-1 text-sm text-text-secondary">Platform-wide snapshot.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Registered users" value={userCount ?? 0} />
        <StatCard
          label="Pending KYC"
          value={pendingKycCount ?? 0}
          tone={pendingKycCount ? "brand" : "default"}
        />
        <StatCard
          label="Pending deposits"
          value={pendingDepositCount ?? 0}
          tone={pendingDepositCount ? "brand" : "default"}
        />
        <StatCard
          label="Pending withdrawals"
          value={pendingWithdrawalCount ?? 0}
          tone={pendingWithdrawalCount ? "brand" : "default"}
        />
        <StatCard label="Total accrued liability" value={formatUsdt(totalLiability, { withSymbol: true })} />
      </div>

      <div className="mt-8 rounded-xl border border-border/60 bg-panel p-5">
        <p className="text-sm font-semibold text-text-primary">Solvency check</p>
        <p className="mt-1 text-xs text-text-secondary">
          Latest logged trading P&L vs. total accrued user liability. See{" "}
          <Link href="/dashboard/bot-performance" className="text-brand">Bot Performance</Link> to log a
          new snapshot.
        </p>
        {latestBotLog ? (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-text-secondary">As of</p>
              <p className="mt-0.5 text-sm font-semibold text-text-primary">{latestBotLog.log_date}</p>
            </div>
            <div>
              <p className="text-xs text-text-secondary">Trading P&L</p>
              <p className="mono-num mt-0.5 text-sm font-semibold text-positive">
                {formatUsdt(latestBotLog.total_trading_pnl, { withSymbol: true })}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-secondary">Accrued liability (logged)</p>
              <p className="mono-num mt-0.5 text-sm font-semibold text-text-primary">
                {formatUsdt(latestBotLog.total_accrued_liability, { withSymbol: true })}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-text-secondary">No bot performance snapshots logged yet.</p>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/dashboard/kyc" className="rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-ink hover:bg-brand-hover">
          Review KYC queue
        </Link>
        <Link href="/dashboard/withdrawals" className="rounded-lg border border-border px-4 py-2.5 text-sm font-bold text-text-primary hover:bg-panel-2">
          Review withdrawal queue
        </Link>
        <Link href="/dashboard/deposits" className="rounded-lg border border-border px-4 py-2.5 text-sm font-bold text-text-primary hover:bg-panel-2">
          Review pending deposits
        </Link>
      </div>
    </div>
  );
}
