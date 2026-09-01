import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/Badge";
import { LiveInvestmentValue } from "@/components/LiveInvestmentValue";
import { ClosePositionButton } from "@/components/ClosePositionButton";
import { SettlementValue } from "@/components/SettlementValue";
import { ButtonLink } from "@/components/ui";
import { formatUsdt, formatPct, formatDate, daysRemaining } from "@/lib/format";

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

  const rows = investments ?? [];

  return (
    <div className="px-4 pt-4 sm:px-6">
      <h1 className="text-xl font-extrabold text-text-primary">Positions</h1>
      <p className="mt-1 text-xs leading-relaxed text-text-secondary">
        7-day plans, 40% minimum return, uncapped upside. Close a position at any time to move its
        value back into your Krypton wallet — withdrawals are made from the wallet.
      </p>

      <div className="mt-4 grid gap-3">
        {rows.length === 0 && (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-card">
            <p className="text-sm font-bold text-text-primary">No positions yet</p>
            <p className="mt-1.5 text-xs text-text-secondary">
              Deposit USDT, then open a position from any market chart.
            </p>
            <div className="mt-4 flex justify-center">
              <ButtonLink href="/trade" variant="primary" size="md">
                Browse markets
              </ButtonLink>
            </div>
          </div>
        )}

        {rows.map((inv) => {
          const tier = inv.investment_tiers as any;
          const principal = parseFloat(String(inv.amount));
          const accrued = parseFloat(String(inv.accrued_return));
          const settleValue = principal + accrued;
          const settlePct = principal > 0 ? (accrued / principal) * 100 : 0;
          const isOpen = inv.status !== "withdrawn";

          return (
            <div key={inv.id} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
              <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-text-primary">
                    {tier?.name ?? "Investment"}
                    {inv.traded_symbol && (
                      <span className="ml-1.5 font-medium text-text-secondary">
                        · {inv.traded_symbol.replace("USDT", "")}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-[10px] text-text-tertiary">
                    Opened {formatDate(inv.start_date)} · Matures {formatDate(inv.maturity_date)}
                  </p>
                </div>
                <StatusBadge status={inv.status} />
              </div>

              <div className="grid grid-cols-3 divide-x divide-border">
                <div className="px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Staked</p>
                  <p className="mono-num mt-1 text-sm font-bold text-text-primary">
                    {formatUsdt(principal, { withSymbol: true })}
                  </p>
                </div>

                <div className="px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                    {isOpen ? "Live value" : "Final value"}
                  </p>
                  {isOpen && inv.traded_symbol ? (
                    <LiveInvestmentValue symbol={inv.traded_symbol} principal={principal} confirmedAccrued={accrued} />
                  ) : (
                    <p className="mono-num mt-1 text-sm font-bold text-text-primary">
                      {formatUsdt(settleValue, { withSymbol: true })}
                    </p>
                  )}
                </div>

                <div className="px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                    {isOpen ? "Settles at" : "Return"}
                  </p>
                  {isOpen ? (
                    <SettlementValue symbol={inv.traded_symbol} principal={principal} accrued={accrued} />
                  ) : (
                    <>
                      <p className="mono-num mt-1 text-sm font-bold text-text-primary">
                        {formatUsdt(accrued, { withSymbol: true })}
                      </p>
                      <p className={`mono-num text-[10px] font-bold ${accrued > 0 ? "text-positive" : "text-text-tertiary"}`}>
                        {formatPct(settlePct, { signed: true })}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-border p-3">
                  <div className="mb-2 flex items-center justify-between text-[10px]">
                    <span className="text-text-tertiary">
                      {inv.status === "active" ? `${daysRemaining(inv.maturity_date)} remaining` : "Matured"}
                    </span>
                    <span className="text-text-tertiary">
                      {tier?.min_return_pct ? `${parseFloat(tier.min_return_pct)}% floor · uncapped` : ""}
                    </span>
                  </div>
                  <ClosePositionButton investmentId={inv.id} symbol={inv.traded_symbol} principal={principal} accrued={accrued} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
