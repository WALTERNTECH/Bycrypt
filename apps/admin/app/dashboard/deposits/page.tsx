import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/Badge";
import { formatUsdt, formatDateTime, truncateMiddle } from "@/lib/format";
import { ReverifyButton } from "./ReverifyButton";

export default async function AdminDepositsPage() {
  const supabase = createClient();
  const { data: deposits } = await supabase
    .from("deposits")
    .select("*, profiles(full_name)")
    .order("submitted_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary">Deposit Log</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Every submitted deposit with on-chain verification status.
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border/60 bg-panel">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-text-secondary">
              <th className="px-5 py-3 font-medium">Submitted</th>
              <th className="px-5 py-3 font-medium">User</th>
              <th className="px-5 py-3 font-medium">Network</th>
              <th className="px-5 py-3 font-medium">Tx hash</th>
              <th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(deposits ?? []).map((d: any) => (
              <tr key={d.id} className="border-t border-border/40">
                <td className="px-5 py-3 text-text-secondary">{formatDateTime(d.submitted_at)}</td>
                <td className="px-5 py-3 text-text-primary">{d.profiles?.full_name ?? "—"}</td>
                <td className="px-5 py-3 text-text-secondary">{d.network ?? "TRC20"}</td>
                <td className="px-5 py-3 font-mono text-xs text-text-secondary">{truncateMiddle(d.tx_hash)}</td>
                <td className="mono-num px-5 py-3 font-semibold text-text-primary">
                  {d.amount ? formatUsdt(d.amount, { withSymbol: true }) : "—"}
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={d.status} />
                </td>
                <td className="px-5 py-3">
                  {d.status !== "confirmed" && <ReverifyButton depositId={d.id} />}
                </td>
              </tr>
            ))}
            {(deposits ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-text-secondary">
                  No deposits yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
