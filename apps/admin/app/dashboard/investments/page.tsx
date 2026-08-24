import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/Badge";
import { formatUsdt, formatDate } from "@/lib/format";
import { PositionValueForm } from "@/components/PositionValueForm";

export default async function AdminInvestmentsPage() {
  const supabase = createClient();
  const { data: investments } = await supabase
    .from("investments")
    .select("*, profiles(full_name), investment_tiers(name, min_return_pct)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary">Investment Tracker</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Every active, matured, and withdrawn investment. Accrued return is logged manually here
        against the bot's actual trading performance — see Bot Performance for the platform-wide
        solvency view.
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border/60 bg-panel">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-text-secondary">
              <th className="px-5 py-3 font-medium">User</th>
              <th className="px-5 py-3 font-medium">Tier</th>
              <th className="px-5 py-3 font-medium">Trading</th>
              <th className="px-5 py-3 font-medium">Principal</th>
              <th className="px-5 py-3 font-medium">Accrued</th>
              <th className="px-5 py-3 font-medium">Maturity</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Position value</th>
            </tr>
          </thead>
          <tbody>
            {(investments ?? []).map((inv: any) => (
              <tr key={inv.id} className="border-t border-border/40">
                <td className="px-5 py-3 text-text-primary">{inv.profiles?.full_name ?? "—"}</td>
                <td className="px-5 py-3 text-text-secondary">{inv.investment_tiers?.name ?? "—"}</td>
                <td className="px-5 py-3 text-text-secondary">{inv.traded_symbol?.replace("USDT", "") ?? "—"}</td>
                <td className="mono-num px-5 py-3 font-semibold text-text-primary">
                  {formatUsdt(inv.amount, { withSymbol: true })}
                </td>
                <td className="mono-num px-5 py-3 font-semibold text-positive">
                  {formatUsdt(inv.accrued_return, { withSymbol: true })}
                </td>
                <td className="px-5 py-3 text-text-secondary">{formatDate(inv.maturity_date)}</td>
                <td className="px-5 py-3">
                  <StatusBadge status={inv.status} />
                </td>
                <td className="px-5 py-3">
                  {inv.status === "withdrawn" ? (
                    <span className="text-xs text-text-tertiary">Closed</span>
                  ) : (
                    <PositionValueForm
                      compact
                      investmentId={inv.id}
                      principal={parseFloat(inv.amount)}
                      minReturnPct={
                        inv.investment_tiers?.min_return_pct ? parseFloat(inv.investment_tiers.min_return_pct) : null
                      }
                      currentAccrued={parseFloat(inv.accrued_return)}
                    />
                  )}
                </td>
              </tr>
            ))}
            {(investments ?? []).length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-text-secondary">
                  No investments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
