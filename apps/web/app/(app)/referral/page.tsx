import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatCard } from "@/components/StatCard";
import { formatUsdt, formatDate } from "@/lib/format";
import { ReferralLink } from "./ReferralLink";
import { MoveToWalletButton } from "./MoveToWalletButton";

export default async function ReferralPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("referral_code, referral_balance")
    .eq("id", user!.id)
    .single();

  // Regular users can't read each other's profile rows via RLS (by
  // design — no policy exposes another user's data). This list only
  // ever needs two harmless columns, so it's fetched with the service
  // role, server-side, and nothing beyond those two fields is returned
  // to the page.
  const admin = createAdminClient();
  const { data: referredUsersRaw } = await admin
    .from("profiles")
    .select("full_name, created_at")
    .eq("referred_by", user!.id)
    .order("created_at", { ascending: false });
  const referredUsers = (referredUsersRaw ?? []).map((r) => ({ full_name: r.full_name, created_at: r.created_at }));

  const referralBalance = parseFloat(String(profile?.referral_balance ?? 0));

  return (
    <div className="px-4 pt-5 sm:px-6">
      <h1 className="text-lg font-bold text-text-primary">Refer & earn</h1>
      <p className="mt-1 text-xs text-text-secondary">
        Share your link. When someone signs up with it and deposits, you earn 10% of every deposit
        they make.
      </p>

      <div className="mt-4">
        <ReferralLink code={profile?.referral_code ?? ""} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatCard label="Referral earnings" value={formatUsdt(referralBalance, { withSymbol: true })} tone="positive" />
        <StatCard label="People referred" value={(referredUsers ?? []).length} />
      </div>

      {referralBalance > 0 && (
        <div className="mt-4 rounded-xl border border-border/60 bg-panel p-4">
          <p className="text-sm font-semibold text-text-primary">Withdraw your earnings</p>
          <p className="mt-1 text-xs text-text-secondary">
            Move your referral earnings into your wallet balance, then withdraw them to your TRC20
            address from the Withdraw page — same as any other funds.
          </p>
          <div className="mt-3">
            <MoveToWalletButton />
          </div>
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-text-primary">Your referrals</h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-border/60 bg-panel">
          {(referredUsers ?? []).length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-text-secondary">
              Nobody has signed up with your link yet.
            </p>
          ) : (
            <ul className="divide-y divide-border/40">
              {(referredUsers ?? []).map((r, i) => (
                <li key={i} className="flex items-center justify-between px-4 py-2.5 text-xs">
                  <span className="text-text-primary">{r.full_name || "New member"}</span>
                  <span className="text-text-secondary">{formatDate(r.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
