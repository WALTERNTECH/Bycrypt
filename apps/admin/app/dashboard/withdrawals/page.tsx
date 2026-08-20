import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/Badge";
import { formatUsdt, formatDateTime, truncateMiddle } from "@/lib/format";
import { WithdrawalActions } from "./WithdrawalActions";

export default async function AdminWithdrawalsPage() {
  const supabase = createClient();
  const { data: withdrawals } = await supabase
    .from("withdrawals")
    .select("*, profiles(full_name)")
    .order("requested_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary">Withdrawal Queue</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Approve or reject pending requests. Approved requests must be paid manually from the
        platform wallet — Krypton does not broadcast transactions on your behalf.
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border/60 bg-panel">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-text-secondary">
              <th className="px-5 py-3 font-medium">Requested</th>
              <th className="px-5 py-3 font-medium">User</th>
              <th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Destination</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(withdrawals ?? []).map((w: any) => (
              <tr key={w.id} className="border-t border-border/40">
                <td className="px-5 py-3 text-text-secondary">{formatDateTime(w.requested_at)}</td>
                <td className="px-5 py-3 text-text-primary">{w.profiles?.full_name ?? "—"}</td>
                <td className="mono-num px-5 py-3 font-semibold text-text-primary">
                  {formatUsdt(w.amount, { withSymbol: true })}
                </td>
                <td className="px-5 py-3 font-mono text-xs text-text-secondary">
                  {truncateMiddle(w.destination_address)}
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={w.status} />
                </td>
                <td className="px-5 py-3">
                  <WithdrawalActions withdrawalId={w.id} status={w.status} />
                </td>
              </tr>
            ))}
            {(withdrawals ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-text-secondary">
                  No withdrawal requests.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
