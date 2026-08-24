import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AccountForms } from "./AccountForms";

export default async function AccountPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user!.id)
    .single();

  return (
    <div className="px-4 pt-5 sm:px-6">
      <h1 className="text-xl font-extrabold text-text-primary">Account</h1>
      <p className="mt-1 text-xs text-text-secondary">{user!.email}</p>

      <Link
        href="/referral"
        className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-surface shadow-card p-4 transition-colors hover:border-brand"
      >
        <div>
          <p className="text-sm font-semibold text-text-primary">Refer & earn</p>
          <p className="mt-0.5 text-xs text-text-secondary">Earn 10% of every deposit from people you refer</p>
        </div>
        <span className="text-brand">→</span>
      </Link>

      <div className="mt-4">
        <AccountForms initialFullName={profile?.full_name ?? ""} initialPhone={profile?.phone ?? ""} />
      </div>
    </div>
  );
}
