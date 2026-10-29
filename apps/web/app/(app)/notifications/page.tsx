import { createClient } from "@/lib/supabase/server";
import { MarkAllRead } from "./MarkAllRead";

export const dynamic = "force-dynamic";

const TONE: Record<string, { label: string; cls: string }> = {
  deposit_confirmed: { label: "Deposit", cls: "bg-positive-dim text-positive" },
  deposit_rejected: { label: "Deposit", cls: "bg-negative-dim text-negative" },
  investment_started: { label: "Position", cls: "bg-brand-dim text-[#8A6100]" },
  investment_cashed_out: { label: "Position", cls: "bg-positive-dim text-positive" },
  referral_bonus: { label: "Referral", cls: "bg-brand-dim text-[#8A6100]" },
  withdrawal_requested: { label: "Withdrawal", cls: "bg-surface-3 text-text-secondary" },
  withdrawal_paid: { label: "Withdrawal", cls: "bg-positive-dim text-positive" }
};

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

export default async function NotificationsPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: rows } = await supabase
    .from("notifications")
    .select("id, type, message, is_read, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const items = rows ?? [];
  const unread = items.filter((n) => !n.is_read).length;

  return (
    <div className="px-4 pt-4 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-bold text-text-primary">Notifications</h1>
          <p className="mt-0.5 text-[12px] text-text-secondary">
            {unread > 0 ? `${unread} unread` : "All caught up"}
          </p>
        </div>
        {unread > 0 && <MarkAllRead />}
      </div>

      {items.length === 0 ? (
        <div className="mt-6 rounded-xl border border-border bg-surface px-4 py-10 text-center">
          <p className="text-[13px] font-semibold text-text-primary">Nothing yet</p>
          <p className="mt-1 text-[12px] text-text-secondary">
            Deposits, positions and referral rewards will appear here.
          </p>
        </div>
      ) : (
        <ul className="mt-4 overflow-hidden rounded-xl border border-border bg-surface">
          {items.map((n) => {
            const tone = TONE[n.type] ?? { label: "Update", cls: "bg-surface-3 text-text-secondary" };
            return (
              <li
                key={n.id}
                className={`border-b border-border px-4 py-3 last:border-b-0 ${
                  n.is_read ? "" : "bg-brand-dim/40"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${tone.cls}`}>
                    {tone.label}
                  </span>
                  {!n.is_read && <span className="h-1.5 w-1.5 rounded-full bg-brand" />}
                  <span className="ml-auto text-[11px] text-text-tertiary">{relative(n.created_at)}</span>
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-text-primary">{n.message}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
