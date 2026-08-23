import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/Badge";
import { formatUsdt, formatDateTime, truncateMiddle } from "@/lib/format";
import { WithdrawForm } from "./WithdrawForm";

const STATUS_MESSAGE: Record<string, string> = {
  pending: "Being processed",
  approved: "Approved — payout in progress",
  processed: "Withdrawal successful",
  rejected: "Not approved"
};

export default async function WithdrawPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: withdrawals }, { data: config }] = await Promise.all([
    supabase.from("profiles").select("wallet_balance").eq("id", user!.id).single(),
    supabase.from("withdrawals").select("*").eq("user_id", user!.id).order("requested_at", { ascending: false }),
    supabase.from("platform_config").select("value").eq("key", "telegram_support_url").maybeSingle()
  ]);

  return (
    <div className="px-4 pt-5 sm:px-6">
      <h1 className="text-lg font-bold text-text-primary">Withdraw</h1>
      <p className="mt-1 text-xs text-text-secondary">
        Withdraw from your wallet balance to any TRC20 address. Krypton Support reviews and sends
        every request.
      </p>

      <div className="mt-4">
        <WithdrawForm
          walletBalance={parseFloat(String(profile?.wallet_balance ?? 0))}
          telegramUrl={config?.value ?? "https://t.me/KRYPTONinv"}
        />
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-text-primary">History</h2>
        <div className="mt-3 grid gap-2">
          {(withdrawals ?? []).length === 0 ? (
            <p className="rounded-xl border border-border/60 bg-panel px-4 py-6 text-center text-xs text-text-secondary">
              No withdrawal requests yet.
            </p>
          ) : (
            (withdrawals ?? []).map((w) => (
              <div key={w.id} className="rounded-xl border border-border/60 bg-panel p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="mono-num text-sm font-semibold text-text-primary">
                      {formatUsdt(w.amount, { withSymbol: true })}
                    </p>
                    <p className="mt-0.5 text-[11px] text-text-secondary">
                      {formatDateTime(w.requested_at)} · to {truncateMiddle(w.destination_address)}
                    </p>
                  </div>
                  <StatusBadge status={w.status} />
                </div>
                <p
                  className={`mt-2 text-xs font-medium ${
                    w.status === "processed"
                      ? "text-positive"
                      : w.status === "rejected"
                      ? "text-negative"
                      : "text-text-secondary"
                  }`}
                >
                  {STATUS_MESSAGE[w.status] ?? w.status}
                  {w.status === "rejected" && w.rejection_reason ? `: ${w.rejection_reason}` : ""}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
