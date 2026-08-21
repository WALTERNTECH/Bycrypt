import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatusBadge, KycStatusBadge } from "@/components/Badge";
import { formatDate, formatUsdt } from "@/lib/format";

export default async function AdminUsersPage() {
  const supabase = createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, phone, status, kyc_status, wallet_balance, created_at")
    .order("created_at", { ascending: false });

  // Email lives in auth.users, not exposed via PostgREST — fetch via the
  // admin API and merge in.
  const admin = createAdminClient();
  const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailById = new Map(authUsers?.users.map((u) => [u.id, u.email]) ?? []);
  const users = (profiles ?? []).map((p) => ({ ...p, email: emailById.get(p.id) ?? "—" }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary">User Directory</h1>
      <p className="mt-1 text-sm text-text-secondary">Every registered depositor, for signup and deposit reconciliation.</p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border/60 bg-panel">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-text-secondary">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Phone</th>
              <th className="px-5 py-3 font-medium">Wallet</th>
              <th className="px-5 py-3 font-medium">KYC</th>
              <th className="px-5 py-3 font-medium">Signed up</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border/40 hover:bg-panel-2">
                <td className="px-5 py-3">
                  <Link href={`/dashboard/users/${u.id}`} className="font-semibold text-text-primary hover:text-brand">
                    {u.full_name || "—"}
                  </Link>
                </td>
                <td className="px-5 py-3 text-text-secondary">{u.email}</td>
                <td className="px-5 py-3 text-text-secondary">{u.phone || "—"}</td>
                <td className="mono-num px-5 py-3 text-text-primary">{formatUsdt(u.wallet_balance ?? 0, { withSymbol: true })}</td>
                <td className="px-5 py-3">
                  <KycStatusBadge status={u.kyc_status} />
                </td>
                <td className="px-5 py-3 text-text-secondary">{formatDate(u.created_at)}</td>
                <td className="px-5 py-3">
                  <StatusBadge status={u.status} />
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-text-secondary">
                  No users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
