import { createClient } from "@/lib/supabase/server";
import { formatUsdt, formatDate } from "@/lib/format";
import { LogSnapshotForm } from "./LogSnapshotForm";

export default async function BotPerformancePage() {
  const supabase = createClient();
  const { data: logs } = await supabase
    .from("bot_performance_logs")
    .select("*")
    .order("log_date", { ascending: false })
    .limit(90);

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary">Bot Performance</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Log actual trading P&L against total accrued user liability — the platform's core
        solvency check. The bot's trading account and execution are managed outside this
        application; this is a manual reporting log.
      </p>

      <div className="mt-6">
        <LogSnapshotForm />
      </div>

      <div className="mt-8 overflow-x-auto rounded-xl border border-border/60 bg-panel">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-text-secondary">
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Trading P&L</th>
              <th className="px-5 py-3 font-medium">Accrued liability</th>
              <th className="px-5 py-3 font-medium">Surplus / deficit</th>
              <th className="px-5 py-3 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).map((log) => {
              const pnl = parseFloat(String(log.total_trading_pnl));
              const liability = parseFloat(String(log.total_accrued_liability));
              const delta = pnl - liability;
              return (
                <tr key={log.id} className="border-t border-border/40">
                  <td className="px-5 py-3 text-text-secondary">{formatDate(log.log_date)}</td>
                  <td className="mono-num px-5 py-3 font-semibold text-text-primary">
                    {formatUsdt(pnl, { withSymbol: true })}
                  </td>
                  <td className="mono-num px-5 py-3 text-text-secondary">{formatUsdt(liability, { withSymbol: true })}</td>
                  <td className={`mono-num px-5 py-3 font-semibold ${delta >= 0 ? "text-positive" : "text-negative"}`}>
                    {delta >= 0 ? "+" : ""}
                    {formatUsdt(delta, { withSymbol: true })}
                  </td>
                  <td className="px-5 py-3 text-text-secondary">{log.notes ?? "—"}</td>
                </tr>
              );
            })}
            {(logs ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-text-secondary">
                  No snapshots logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
