import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatusBadge, KycStatusBadge } from "@/components/Badge";
import { formatUsdt, formatDateTime } from "@/lib/format";
import { AdjustWalletForm } from "./AdjustWalletForm";

export default async function UserDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", params.id).maybeSingle();
  if (!profile) notFound();

  const admin = createAdminClient();
  const { data: authUser } = await admin.auth.admin.getUserById(params.id);

  const referrerName = profile.referred_by
    ? (await admin.from("profiles").select("full_name").eq("id", profile.referred_by).maybeSingle()).data?.full_name
    : null;

  const [{ data: deposits }, { data: investments }, { data: withdrawals }, { data: kycSubmissions }] = await Promise.all([
    supabase.from("deposits").select("*").eq("user_id", params.id).order("submitted_at", { ascending: false }),
    supabase
      .from("investments")
      .select("*, investment_tiers(name)")
      .eq("user_id", params.id)
      .order("created_at", { ascending: false }),
    supabase.from("withdrawals").select("*").eq("user_id", params.id).order("requested_at", { ascending: false }),
    supabase.from("kyc_submissions").select("*").eq("user_id", params.id).order("submitted_at", { ascending: false })
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary">{profile.full_name || "Unnamed user"}</h1>
      <p className="mt-1 text-sm text-text-secondary">
        {authUser?.user?.email} {profile.phone ? `· ${profile.phone}` : ""}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <StatusBadge status={profile.status} />
        <KycStatusBadge status={profile.kyc_status} />
        <span className="mono-num rounded-md bg-panel-2 px-2 py-0.5 text-xs font-semibold text-text-primary">
          Wallet: {formatUsdt(profile.wallet_balance ?? 0, { withSymbol: true })}
        </span>
        <span className="mono-num rounded-md bg-panel-2 px-2 py-0.5 text-xs font-semibold text-positive">
          Referral earnings: {formatUsdt(profile.referral_balance ?? 0, { withSymbol: true })}
        </span>
      </div>
      <p className="mt-2 text-xs text-text-secondary">
        Referral code: <span className="font-mono text-text-primary">{profile.referral_code}</span>
        {referrerName && (
          <>
            {" "}
            · Referred by <span className="text-text-primary">{referrerName}</span>
          </>
        )}
      </p>

      <div className="mt-6">
        <AdjustWalletForm userId={params.id} />
      </div>

      <Section title="KYC submissions">
        <Table
          rows={kycSubmissions ?? []}
          empty="No verification submitted yet."
          columns={[
            { header: "Submitted", cell: (k: any) => formatDateTime(k.submitted_at) },
            { header: "ID type", cell: (k: any) => k.id_type.replace(/_/g, " ") },
            { header: "ID number", cell: (k: any) => k.id_number },
            { header: "Status", cell: (k: any) => <StatusBadge status={k.status} /> }
          ]}
        />
        <div className="border-t border-border/40 px-5 py-3 text-xs text-text-secondary">
          Review and approve/reject submissions from the{" "}
          <a href="/dashboard/kyc" className="text-brand">
            KYC queue
          </a>
          .
        </div>
      </Section>

      <Section title="Deposits">
        <Table
          rows={deposits ?? []}
          empty="No deposits."
          columns={[
            { header: "Submitted", cell: (d) => formatDateTime(d.submitted_at) },
            { header: "Claimed", cell: (d) => (d.claimed_amount ? formatUsdt(d.claimed_amount, { withSymbol: true }) : "—") },
            { header: "Credited", cell: (d) => (d.amount ? formatUsdt(d.amount, { withSymbol: true }) : "—") },
            { header: "Tx hash", cell: (d) => <span className="font-mono text-xs">{d.tx_hash.slice(0, 16)}…</span> },
            { header: "Status", cell: (d) => <StatusBadge status={d.status} /> }
          ]}
        />
      </Section>

      <Section title="Investments">
        <Table
          rows={investments ?? []}
          empty="No investments."
          columns={[
            { header: "Tier", cell: (i) => i.investment_tiers?.name ?? "—" },
            { header: "Principal", cell: (i) => formatUsdt(i.amount, { withSymbol: true }) },
            { header: "Accrued", cell: (i) => formatUsdt(i.accrued_return, { withSymbol: true }) },
            { header: "Maturity", cell: (i) => formatDateTime(i.maturity_date) },
            { header: "Status", cell: (i) => <StatusBadge status={i.status} /> }
          ]}
        />
      </Section>

      <Section title="Withdrawals">
        <Table
          rows={withdrawals ?? []}
          empty="No withdrawals."
          columns={[
            { header: "Requested", cell: (w) => formatDateTime(w.requested_at) },
            { header: "Amount", cell: (w) => formatUsdt(w.amount, { withSymbol: true }) },
            { header: "Destination", cell: (w) => <span className="font-mono text-xs">{w.destination_address}</span> },
            { header: "Status", cell: (w) => <StatusBadge status={w.status} /> }
          ]}
        />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
      <div className="mt-3 overflow-x-auto rounded-xl border border-border/60 bg-panel">{children}</div>
    </div>
  );
}

function Table<T extends { id: string | number }>({
  rows,
  columns,
  empty
}: {
  rows: T[];
  columns: { header: string; cell: (row: T) => React.ReactNode }[];
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="px-5 py-6 text-center text-sm text-text-secondary">{empty}</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs uppercase tracking-wide text-text-secondary">
          {columns.map((c) => (
            <th key={c.header} className="px-5 py-3 font-medium">
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-t border-border/40">
            {columns.map((c) => (
              <td key={c.header} className="px-5 py-3 text-text-primary">
                {c.cell(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
