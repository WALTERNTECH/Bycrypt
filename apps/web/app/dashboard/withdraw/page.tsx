import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/Badge";
import { formatUsdt, formatDateTime, truncateMiddle } from "@/lib/format";
import { WithdrawForm } from "./WithdrawForm";

export default async function WithdrawPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const [{ data: maturedInvestments }, { data: withdrawals }] = await Promise.all([
    supabase
      .from("investments")
      .select("id, amount, accrued_return, maturity_date, investment_tiers(name)")
      .eq("user_id", user!.id)
      .eq("status", "matured")
      .order("maturity_date"),
    supabase
      .from("withdrawals")
      .select("*")
      .eq("user_id", user!.id)
      .order("requested_at", { ascending: false })
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-text-primary">Withdraw</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Withdrawals become available once an investment reaches its maturity date. An admin
        reviews and processes every request to your provided TRC20 wallet.
      </p>

      <div className="mt-6">
        <WithdrawForm investments={(maturedInvestments as any) ?? []} />
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-text-primary">Withdrawal history</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-border/60 bg-panel">
          {(withdrawals ?? []).length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-text-secondary">No withdrawal requests yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-text-secondary">
                  <th className="px-5 py-3 font-medium">Requested</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">To</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(withdrawals ?? []).map((w) => (
                  <tr key={w.id} className="border-t border-border/40">
                    <td className="px-5 py-3 text-text-secondary">{formatDateTime(w.requested_at)}</td>
                    <td className="mono-num px-5 py-3 font-semibold text-text-primary">
                      {formatUsdt(w.amount, { withSymbol: true })}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-text-secondary">
                      {truncateMiddle(w.destination_address)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={w.status} />
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
