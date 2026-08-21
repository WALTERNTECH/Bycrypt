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
      <h1 className="text-lg font-bold text-text-primary">Account</h1>
      <p className="mt-1 text-xs text-text-secondary">{user!.email}</p>

      <div className="mt-4">
        <AccountForms initialFullName={profile?.full_name ?? ""} initialPhone={profile?.phone ?? ""} />
      </div>
    </div>
  );
}
