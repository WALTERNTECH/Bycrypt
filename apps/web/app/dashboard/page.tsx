import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/Badge";
import { formatUsdt, formatDate, daysRemaining } from "@/lib/format";

export default async function DashboardOverviewPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: investments }, { data: deposits }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user!.id).single(),
    supabase
      .from("investments")
      .select("*, investment_tiers(name)")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false }),
    supabase.from("deposits").select("*").eq("user_id", user!.id).order("submitted_at", { ascending: false }).limit(5)
  ]);

  const active = (investments ?? []).filter((i) => i.status === "active" || i.status === "matured");
  const totalPrincipal = active.reduce((sum, i) => sum + parseFloat(i.amount), 0);
  const totalAccrued = active.reduce((sum, i) => sum + parseFloat(i.accrued_return), 0);
  const nextMaturity = (investments ?? [])
    .filter((i) => i.status === "active")
    .sort((a, b) => new Date(a.maturity_date).getTime() - new Date(b.maturity_date).getTime())[0];

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary">
        Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
      </h1>
      <p className="mt-1 text-sm text-text-secondary">Here's where your investments stand today.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total deposited" value={formatUsdt(totalPrincipal, { withSymbol: true })} sub="Across active + matured" />
        <StatCard label="Accrued return" value={formatUsdt(totalAccrued, { withSymbol: true })} tone="positive" sub="Logged by the trading bot" />
        <StatCard label="Active investments" value={active.filter((i) => i.status === "active").length} />
        <StatCard
          label="Next maturity"
          value={nextMaturity ? formatDate(nextMaturity.maturity_date) : "—"}
          sub={nextMaturity ? `${daysRemaining(nextMaturity.maturity_date)} days remaining` : "No active investments"}
        />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/dashboard/deposit" className="rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-base hover:bg-brand-hover">
          New deposit
        </Link>
        <Link href="/dashboard/withdraw" className="rounded-lg border border-border px-5 py-2.5 text-sm font-bold text-text-primary hover:bg-panel">
          Request withdrawal
        </Link>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-text-primary">Recent deposits</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-border/60 bg-panel">
          {(deposits ?? []).length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-text-secondary">No deposits yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-text-secondary">
                  <th className="px-5 py-3 font-medium">Submitted</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(deposits ?? []).map((d) => (
                  <tr key={d.id} className="border-t border-border/40">
                    <td className="px-5 py-3 text-text-secondary">{formatDate(d.submitted_at)}</td>
                    <td className="mono-num px-5 py-3 font-semibold text-text-primary">
                      {d.amount ? formatUsdt(d.amount, { withSymbol: true }) : "Pending verification"}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={d.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
