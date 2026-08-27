"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBadge, KycStatusBadge } from "@/components/Badge";
import { formatUsdt, formatDateTime } from "@/lib/format";

export interface UserRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string;
  status: string;
  kyc_status: string;
  wallet_balance: number;
  created_at: string;
  deposit_count: number;
  deposit_total: number;
  last_deposit_at: string | null;
  last_deposit_amount: number | null;
}

type SortKey = "newest" | "oldest" | "wallet" | "deposits" | "name";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest signup" },
  { key: "oldest", label: "Oldest signup" },
  { key: "wallet", label: "Wallet ↓" },
  { key: "deposits", label: "Deposited ↓" },
  { key: "name", label: "Name A–Z" }
];

export function UsersTable({ users }: { users: UserRow[] }) {
  const [sort, setSort] = useState<SortKey>("newest");
  const [query, setQuery] = useState("");
  const [kycFilter, setKycFilter] = useState<string>("all");

  const rows = useMemo(() => {
    let out = users;

    const q = query.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (u) =>
          (u.full_name ?? "").toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.phone ?? "").toLowerCase().includes(q)
      );
    }
    if (kycFilter !== "all") out = out.filter((u) => u.kyc_status === kycFilter);

    const sorted = [...out];
    sorted.sort((a, b) => {
      switch (sort) {
        case "oldest":
          return +new Date(a.created_at) - +new Date(b.created_at);
        case "wallet":
          return b.wallet_balance - a.wallet_balance;
        case "deposits":
          return b.deposit_total - a.deposit_total;
        case "name":
          return (a.full_name ?? "").localeCompare(b.full_name ?? "");
        case "newest":
        default:
          return +new Date(b.created_at) - +new Date(a.created_at);
      }
    });
    return sorted;
  }, [users, sort, query, kycFilter]);

  const control =
    "rounded-lg border border-border bg-panel-2 px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-brand";

  return (
    <div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email or phone"
          className={`${control} min-w-[220px] flex-1`}
        />
        <select value={kycFilter} onChange={(e) => setKycFilter(e.target.value)} className={control}>
          <option value="all">All KYC</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
          <option value="unverified">Unverified</option>
        </select>
        <div className="flex gap-1 rounded-lg border border-border bg-panel p-0.5">
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className={`rounded-md px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
                sort === s.key ? "bg-surface-3 text-brand" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-text-secondary">
          {rows.length} of {users.length}
        </span>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-panel">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-text-secondary">
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Signed up</th>
              <th className="px-4 py-3 font-medium">Wallet</th>
              <th className="px-4 py-3 font-medium">Deposited</th>
              <th className="px-4 py-3 font-medium">Last deposit</th>
              <th className="px-4 py-3 font-medium">KYC</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-t border-border align-top hover:bg-panel-2">
                <td className="px-4 py-3">
                  <Link href={`/dashboard/users/${u.id}`} className="font-semibold text-text-primary hover:text-brand">
                    {u.full_name || "—"}
                  </Link>
                  <div className="text-xs text-text-secondary">{u.email}</div>
                  {u.phone && <div className="text-xs text-text-tertiary">{u.phone}</div>}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-text-secondary">
                  {formatDateTime(u.created_at)}
                </td>
                <td className="px-4 py-3">
                  <WalletCell userId={u.id} balance={u.wallet_balance} name={u.full_name || u.email} />
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span className="mono-num font-semibold text-text-primary">
                    {formatUsdt(u.deposit_total, { withSymbol: true })}
                  </span>
                  <div className="text-xs text-text-tertiary">
                    {u.deposit_count} {u.deposit_count === 1 ? "deposit" : "deposits"}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs">
                  {u.last_deposit_at ? (
                    <>
                      <span className="mono-num font-semibold text-positive">
                        {formatUsdt(u.last_deposit_amount ?? 0, { withSymbol: true })}
                      </span>
                      <div className="text-text-secondary">{formatDateTime(u.last_deposit_at)}</div>
                    </>
                  ) : (
                    <span className="text-text-tertiary">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <KycStatusBadge status={u.kyc_status} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={u.status} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-text-secondary">
                  No users match that filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Inline balance editor — sets an absolute figure, server-side. */
function WalletCell({ userId, balance, name }: { userId: string; balance: number; name: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(balance.toFixed(2));
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    const target = parseFloat(value);
    if (Number.isNaN(target) || target < 0) return setError("Enter a valid balance.");
    if (!reason.trim()) return setError("A reason is required.");

    setLoading(true);
    const res = await fetch(`/api/users/${userId}/adjust-wallet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_balance: target, reason: reason.trim() })
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      return setError(d.error ?? "Failed.");
    }
    setEditing(false);
    setReason("");
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="mono-num font-semibold text-text-primary">
          {formatUsdt(balance, { withSymbol: true })}
        </span>
        <button
          onClick={() => {
            setValue(balance.toFixed(2));
            setEditing(true);
          }}
          title={`Edit ${name}'s wallet balance`}
          className="rounded-md border border-border bg-panel-2 px-2 py-0.5 text-[10px] font-bold text-text-secondary transition-colors hover:border-brand hover:text-brand"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="min-w-[190px]">
      <div className="flex items-center gap-1">
        <span className="text-xs text-text-secondary">$</span>
        <input
          type="number"
          step="0.01"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-24 rounded-md border border-border bg-panel-2 px-1.5 py-1 text-xs text-text-primary outline-none focus:border-brand"
        />
      </div>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (shown to user)"
        className="mt-1 w-full rounded-md border border-border bg-panel-2 px-1.5 py-1 text-[11px] text-text-primary outline-none focus:border-brand"
      />
      <div className="mt-1 flex gap-1">
        <button
          onClick={save}
          disabled={loading}
          className="rounded-md bg-brand px-2 py-1 text-[10px] font-bold text-ink hover:bg-brand-hover disabled:opacity-50"
        >
          {loading ? "…" : "Save"}
        </button>
        <button
          onClick={() => {
            setEditing(false);
            setError(null);
          }}
          className="rounded-md border border-border px-2 py-1 text-[10px] font-bold text-text-secondary"
        >
          Cancel
        </button>
      </div>
      {error && <p className="mt-1 text-[10px] text-negative">{error}</p>}
    </div>
  );
}
