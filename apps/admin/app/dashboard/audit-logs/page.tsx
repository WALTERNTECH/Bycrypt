import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

export default async function AuditLogsPage() {
  const supabase = createClient();
  const { data: logs } = await supabase
    .from("audit_logs")
    .select("*, admin_users(full_name)")
    .order("created_at", { ascending: false })
    .limit(300);

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary">Audit Trail</h1>
      <p className="mt-1 text-sm text-text-secondary">Every administrative action, for accountability.</p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border/60 bg-panel">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-text-secondary">
              <th className="px-5 py-3 font-medium">When</th>
              <th className="px-5 py-3 font-medium">Admin</th>
              <th className="px-5 py-3 font-medium">Action</th>
              <th className="px-5 py-3 font-medium">Target</th>
              <th className="px-5 py-3 font-medium">Metadata</th>
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).map((log: any) => (
              <tr key={log.id} className="border-t border-border/40">
                <td className="px-5 py-3 text-text-secondary">{formatDateTime(log.created_at)}</td>
                <td className="px-5 py-3 text-text-primary">{log.admin_users?.full_name ?? "—"}</td>
                <td className="px-5 py-3 font-semibold text-text-primary">{log.action}</td>
                <td className="px-5 py-3 text-text-secondary">
                  {log.target_type ? `${log.target_type} · ${String(log.target_id).slice(0, 8)}` : "—"}
                </td>
                <td className="px-5 py-3 font-mono text-xs text-text-secondary">
                  {log.metadata ? JSON.stringify(log.metadata) : "—"}
                </td>
              </tr>
            ))}
            {(logs ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-text-secondary">
                  No admin actions logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
