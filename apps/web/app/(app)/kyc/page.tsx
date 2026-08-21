import { createClient } from "@/lib/supabase/server";
import { KycForm } from "./KycForm";

export default async function KycPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: latest }] = await Promise.all([
    supabase.from("profiles").select("kyc_status, full_name").eq("id", user!.id).single(),
    supabase
      .from("kyc_submissions")
      .select("status, rejection_reason, submitted_at")
      .eq("user_id", user!.id)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  const status = profile?.kyc_status ?? "unverified";

  return (
    <div className="px-4 pt-5 sm:px-6">
      <h1 className="text-lg font-bold text-text-primary">Identity verification</h1>
      <p className="mt-1 text-xs text-text-secondary">
        Required once before you can deposit or trade. Your documents are reviewed manually and
        never shown to anyone but Krypton staff.
      </p>

      <div className="mt-4">
        {status === "approved" ? (
          <div className="rounded-xl border border-positive/40 bg-positive/10 p-6 text-center">
            <p className="text-sm font-bold text-positive">You're verified</p>
            <p className="mt-2 text-xs text-text-secondary">Deposits and trading are fully unlocked on your account.</p>
          </div>
        ) : status === "pending" ? (
          <div className="rounded-xl border border-border/60 bg-panel p-6 text-center">
            <p className="text-sm font-bold text-text-primary">Under review</p>
            <p className="mt-2 text-xs text-text-secondary">
              We're checking your submission from {latest ? new Date(latest.submitted_at).toLocaleDateString() : "recently"}.
              You'll be notified as soon as it's decided.
            </p>
          </div>
        ) : (
          <>
            {status === "rejected" && latest?.rejection_reason && (
              <div className="mb-4 rounded-xl border border-negative/40 bg-negative/10 p-4">
                <p className="text-xs font-semibold text-negative">Your last submission wasn't approved</p>
                <p className="mt-1 text-xs text-text-secondary">{latest.rejection_reason}</p>
              </div>
            )}
            <KycForm defaultFullName={profile?.full_name ?? ""} />
          </>
        )}
      </div>
    </div>
  );
}
