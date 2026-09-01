import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { UsersTable, type UserRow } from "./UsersTable";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const supabase = createClient();

  const [{ data: profiles }, { data: deposits }, { data: openPositions }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, phone, status, wallet_balance, created_at")
      .order("created_at", { ascending: false }),
    // Confirmed deposits only — a pending row isn't money the user has.
    supabase
      .from("deposits")
      .select("user_id, amount, confirmed_at")
      .eq("status", "confirmed")
      .order("confirmed_at", { ascending: false }),
    // Capital in an open position. Without this a user showing a $0
    // wallet reads as broke when their money is simply in a trade.
    supabase
      .from("investments")
      .select("user_id, amount, accrued_return, traded_symbol")
      .neq("status", "withdrawn")
  ]);

  // Email lives in auth.users, not exposed via PostgREST — fetch via the
  // admin API and merge in.
  const admin = createAdminClient();
  const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailById = new Map(authUsers?.users.map((u) => [u.id, u.email]) ?? []);

  // Roll deposits up per user. The list is already newest-first, so the
  // first row seen for a user is their most recent deposit.
  const agg = new Map<string, { count: number; total: number; lastAt: string | null; lastAmount: number | null }>();
  for (const d of deposits ?? []) {
    const amount = parseFloat(String(d.amount ?? 0));
    const cur = agg.get(d.user_id) ?? { count: 0, total: 0, lastAt: null, lastAmount: null };
    cur.count += 1;
    cur.total += amount;
    if (cur.lastAt === null) {
      cur.lastAt = d.confirmed_at;
      cur.lastAmount = amount;
    }
    agg.set(d.user_id, cur);
  }

  const positionByUser = new Map<string, { value: number; symbol: string | null }>();
  for (const inv of openPositions ?? []) {
    const value = parseFloat(String(inv.amount)) + parseFloat(String(inv.accrued_return));
    const cur = positionByUser.get(inv.user_id);
    positionByUser.set(inv.user_id, {
      value: (cur?.value ?? 0) + value,
      symbol: cur?.symbol ?? inv.traded_symbol
    });
  }

  const users: UserRow[] = (profiles ?? []).map((p) => {
    const a = agg.get(p.id);
    const pos = positionByUser.get(p.id);
    const wallet = parseFloat(String(p.wallet_balance ?? 0));
    return {
      id: p.id,
      full_name: p.full_name,
      phone: p.phone,
      email: emailById.get(p.id) ?? "—",
      status: p.status,
      wallet_balance: wallet,
      position_value: pos?.value ?? 0,
      position_symbol: pos?.symbol ?? null,
      total_balance: wallet + (pos?.value ?? 0),
      created_at: p.created_at,
      deposit_count: a?.count ?? 0,
      deposit_total: a?.total ?? 0,
      last_deposit_at: a?.lastAt ?? null,
      last_deposit_amount: a?.lastAmount ?? null
    };
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary">User Directory</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Newest signups first. Search, filter and sort the list, see what each user has deposited and
        when, and correct any wallet balance inline.
      </p>

      <UsersTable users={users} />
    </div>
  );
}
