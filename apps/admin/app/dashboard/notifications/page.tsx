import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { MarkReadButton, MarkAllReadButton } from "./NotificationActions";

const LINKS: Record<string, string> = {
  deposit_submitted: "/dashboard/deposits",
  withdrawal_requested: "/dashboard/withdrawals"
};

export default async function AdminNotificationsPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("admin_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const unread = (notifications ?? []).filter((n) => !n.is_read);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Notifications</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Deposits and withdrawals needing reconciliation land here first.
          </p>
        </div>
        {unread.length > 0 && <MarkAllReadButton />}
      </div>

      <div className="mt-6 grid gap-2">
        {(notifications ?? []).length === 0 && (
          <p className="rounded-xl border border-border/60 bg-panel p-8 text-center text-sm text-text-secondary">
            No notifications yet.
          </p>
        )}
        {(notifications ?? []).map((n) => (
          <div
            key={n.id}
            className={`flex items-start justify-between gap-3 rounded-xl border p-4 ${
              n.is_read ? "border-border/60 bg-panel" : "border-brand/40 bg-brand/[0.04]"
            }`}
          >
            <div>
              <p className="text-sm text-text-primary">{n.message}</p>
              <p className="mt-1 text-xs text-text-secondary">{formatDateTime(n.created_at)}</p>
              {LINKS[n.type] && (
                <a href={LINKS[n.type]} className="mt-1 inline-block text-xs font-semibold text-brand">
                  Go to queue →
                </a>
              )}
            </div>
            {!n.is_read && <MarkReadButton notificationId={n.id} />}
          </div>
        ))}
      </div>
    </div>
  );
}
