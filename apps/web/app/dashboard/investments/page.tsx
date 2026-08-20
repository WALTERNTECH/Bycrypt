import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/Badge";
import { formatUsdt, formatDate, daysRemaining } from "@/lib/format";

export default async function InvestmentsPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: investments } = await supabase
    .from("investments")
    .select("*, investment_tiers(name, lockup_days)")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary">Your investments</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Every investment activated from a confirmed deposit, with its maturity date and accrued
        return.
      </p>

      <div className="mt-6 grid gap-4">
        {(investments ?? []).length === 0 && (
          <div className="rounded-xl border border-border/60 bg-panel p-8 text-center text-sm text-text-secondary">
            You don't have any investments yet. Make a deposit to get started.
          </div>
        )}
        {(investments ?? []).map((inv) => {
          const tier = inv.investment_tiers as any;
          const remaining = daysRemaining(inv.maturity_date);
          return (
            <div key={inv.id} className="rounded-xl border border-border/60 bg-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary">{tier?.name ?? "Investment"}</p>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    Started {formatDate(inv.start_date)} · Matures {formatDate(inv.maturity_date)}
                  </p>
                </div>
                <StatusBadge status={inv.status} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-text-secondary">Principal</p>
                  <p className="mono-num mt-0.5 text-sm font-semibold text-text-primary">
                    {formatUsdt(inv.amount, { withSymbol: true })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Max return</p>
                  <p className="mono-num mt-0.5 text-sm font-semibold text-positive">Up to {inv.max_return_pct}%</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Accrued return</p>
                  <p className="mono-num mt-0.5 text-sm font-semibold text-positive">
                    {formatUsdt(inv.accrued_return, { withSymbol: true })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary">
                    {inv.status === "active" ? "Days remaining" : "Status"}
                  </p>
                  <p className="mono-num mt-0.5 text-sm font-semibold text-text-primary">
                    {inv.status === "active" ? remaining : tier?.lockup_days ? `${tier.lockup_days}-day tier` : "—"}
                  </p>
                </div>
              </div>

              {inv.status === "matured" && (
                <a href="/dashboard/withdraw" className="mt-4 inline-block text-sm font-semibold text-brand">
                  This investment is ready to withdraw →
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
