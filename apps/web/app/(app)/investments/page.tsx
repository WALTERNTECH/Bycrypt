import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/Badge";
import { LiveInvestmentValue } from "@/components/LiveInvestmentValue";
import { CashOutButton } from "@/components/CashOutButton";
import { formatUsdt, formatDate, daysRemaining } from "@/lib/format";

export default async function InvestmentsPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: investments } = await supabase
    .from("investments")
    .select("*, investment_tiers(name, lockup_days, min_return_pct)")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="px-4 pt-5 sm:px-6">
      <h1 className="text-lg font-bold text-text-primary">Your investments</h1>
      <p className="mt-1 text-xs text-text-secondary">
        7-day plans, minimum 40% return, uncapped upside. Cash out to your wallet any time you're
        in profit.
      </p>

      <div className="mt-4 grid gap-3">
        {(investments ?? []).length === 0 && (
          <div className="rounded-xl border border-border/60 bg-panel p-8 text-center text-xs text-text-secondary">
            You don't have any investments yet. Make a deposit, then trade it into a plan.
          </div>
        )}
        {(investments ?? []).map((inv) => {
          const tier = inv.investment_tiers as any;
          const remaining = daysRemaining(inv.maturity_date);
          const principal = parseFloat(String(inv.amount));
          const accrued = parseFloat(String(inv.accrued_return));
          const inProfit = accrued > 0 && inv.status !== "withdrawn";
          return (
            <div key={inv.id} className="rounded-xl border border-border/60 bg-panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    {tier?.name ?? "Investment"}
                    {inv.traded_symbol && <span className="ml-1.5 text-text-secondary">· {inv.traded_symbol.replace("USDT", "")}</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    Started {formatDate(inv.start_date)} · Matures {formatDate(inv.maturity_date)}
                  </p>
                </div>
                <StatusBadge status={inv.status} />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-[10px] text-text-secondary">Principal</p>
                  <p className="mono-num mt-0.5 text-sm font-semibold text-text-primary">
                    {formatUsdt(inv.amount, { withSymbol: true })}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-text-secondary">Live value</p>
                  {inv.traded_symbol ? (
                    <LiveInvestmentValue symbol={inv.traded_symbol} principal={principal} confirmedAccrued={accrued} />
                  ) : (
                    <p className="mono-num mt-0.5 text-sm font-semibold text-positive">{formatUsdt(accrued, { withSymbol: true })}</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] text-text-secondary">
                    {inv.status === "active" ? "Days remaining" : "Status"}
                  </p>
                  <p className="mono-num mt-0.5 text-sm font-semibold text-text-primary">
                    {inv.status === "active" ? remaining : tier?.lockup_days ? `${tier.lockup_days}-day plan` : "—"}
                  </p>
                </div>
              </div>

              {inProfit && <CashOutButton investmentId={inv.id} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
