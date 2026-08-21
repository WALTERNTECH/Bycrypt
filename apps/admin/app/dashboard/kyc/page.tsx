import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatusBadge } from "@/components/Badge";
import { formatDateTime } from "@/lib/format";
import { KycReviewActions } from "./KycReviewActions";

const SIGNED_URL_TTL_SECONDS = 60 * 10; // 10 minutes — plenty for a review session

export default async function KycQueuePage() {
  const supabase = createClient();
  const { data: submissions } = await supabase
    .from("kyc_submissions")
    .select("*, profiles(full_name)")
    .order("submitted_at", { ascending: false })
    .limit(100);

  const admin = createAdminClient();
  const withUrls = await Promise.all(
    (submissions ?? []).map(async (s: any) => {
      const paths = [s.id_front_path, s.id_back_path, s.selfie_path].filter(Boolean) as string[];
      const signed = await Promise.all(
        paths.map((p) => admin.storage.from("kyc-documents").createSignedUrl(p, SIGNED_URL_TTL_SECONDS))
      );
      return {
        ...s,
        frontUrl: signed[0]?.data?.signedUrl,
        backUrl: s.id_back_path ? signed[1]?.data?.signedUrl : null,
        selfieUrl: s.id_back_path ? signed[2]?.data?.signedUrl : signed[1]?.data?.signedUrl
      };
    })
  );

  const pending = withUrls.filter((s) => s.status === "pending");
  const decided = withUrls.filter((s) => s.status !== "pending");

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary">KYC Queue</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Review submitted identity documents. Approving unlocks deposits and trading for that user.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-text-primary">Pending ({pending.length})</h2>
      <div className="mt-3 grid gap-4">
        {pending.length === 0 && (
          <p className="rounded-xl border border-border/60 bg-panel p-6 text-center text-sm text-text-secondary">
            Nothing waiting for review.
          </p>
        )}
        {pending.map((s) => (
          <SubmissionCard key={s.id} submission={s} />
        ))}
      </div>

      {decided.length > 0 && (
        <>
          <h2 className="mt-10 text-lg font-semibold text-text-primary">Previously decided</h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-border/60 bg-panel">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-text-secondary">
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Submitted</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {decided.map((s) => (
                  <tr key={s.id} className="border-t border-border/40">
                    <td className="px-5 py-3 text-text-primary">{s.profiles?.full_name ?? "—"}</td>
                    <td className="px-5 py-3 text-text-secondary">{formatDateTime(s.submitted_at)}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-5 py-3 text-text-secondary">{s.rejection_reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function SubmissionCard({ submission: s }: { submission: any }) {
  return (
    <div className="rounded-xl border border-border/60 bg-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text-primary">{s.profiles?.full_name ?? "Unknown user"}</p>
          <p className="mt-0.5 text-xs text-text-secondary">Submitted {formatDateTime(s.submitted_at)}</p>
        </div>
        <StatusBadge status={s.status} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
        <div>
          <p className="text-text-secondary">Full name</p>
          <p className="mt-0.5 font-semibold text-text-primary">{s.full_name}</p>
        </div>
        <div>
          <p className="text-text-secondary">Date of birth</p>
          <p className="mt-0.5 font-semibold text-text-primary">{s.date_of_birth}</p>
        </div>
        <div>
          <p className="text-text-secondary">ID type</p>
          <p className="mt-0.5 font-semibold capitalize text-text-primary">{s.id_type.replace(/_/g, " ")}</p>
        </div>
        <div>
          <p className="text-text-secondary">ID number</p>
          <p className="mt-0.5 font-semibold text-text-primary">{s.id_number}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <DocThumb label="ID front" url={s.frontUrl} />
        <DocThumb label="ID back" url={s.backUrl} />
        <DocThumb label="Selfie" url={s.selfieUrl} />
      </div>

      <div className="mt-4">
        <KycReviewActions submissionId={s.id} />
      </div>
    </div>
  );
}

function DocThumb({ label, url }: { label: string; url?: string | null }) {
  return (
    <a
      href={url ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      className={`block overflow-hidden rounded-lg border border-border/60 bg-panel-2 ${!url ? "pointer-events-none opacity-40" : ""}`}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={label} className="h-28 w-full object-cover" />
      ) : (
        <div className="flex h-28 items-center justify-center text-xs text-text-secondary">Not provided</div>
      )}
      <p className="px-2 py-1.5 text-center text-[10px] font-semibold text-text-secondary">{label}</p>
    </a>
  );
}
