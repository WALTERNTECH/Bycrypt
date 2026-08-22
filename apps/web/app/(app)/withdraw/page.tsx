import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/Badge";
import { formatUsdt, formatDateTime, truncateMiddle } from "@/lib/format";
import { WithdrawForm } from "./WithdrawForm";

export default async function WithdrawPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: withdrawals }] = await Promise.all([
    supabase.from("profiles").select("wallet_balance").eq("id", user!.id).single(),
    supabase.from("withdrawals").select("*").eq("user_id", user!.id).order("requested_at", { ascending: false })
  ]);

  return (
    <div className="px-4 pt-5 sm:px-6">
      <h1 className="text-lg font-bold text-text-primary">Withdraw</h1>
      <p className="mt-1 text-xs text-text-secondary">
        Withdraw from your wallet balance to any TRC20 address. Krypton Support reviews and sends
        every request.
      </p>

      <div className="mt-4">
        <WithdrawForm walletBalance={parseFloat(String(profile?.wallet_balance ?? 0))} />
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-text-primary">History</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-border/60 bg-panel">
          {(withdrawals ?? []).length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-text-secondary">No withdrawal requests yet.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left uppercase tracking-wide text-text-secondary">
                  <th className="px-4 py-2.5 font-medium">Requested</th>
                  <th className="px-4 py-2.5 font-medium">Amount</th>
                  <th className="px-4 py-2.5 font-medium">To</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(withdrawals ?? []).map((w) => (
                  <tr key={w.id} className="border-t border-border/40">
                    <td className="px-4 py-2.5 text-text-secondary">{formatDateTime(w.requested_at)}</td>
                    <td className="mono-num px-4 py-2.5 font-semibold text-text-primary">
                      {formatUsdt(w.amount, { withSymbol: true })}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[10px] text-text-secondary">
                      {truncateMiddle(w.destination_address)}
                    </td>
                    <td className="px-4 py-2.5">
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
