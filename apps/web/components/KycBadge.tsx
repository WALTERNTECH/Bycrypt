import Link from "next/link";
import { ShieldIcon } from "./icons";

const STYLES: Record<string, string> = {
  approved: "text-positive ring-positive/40",
  pending: "text-brand ring-brand/40",
  rejected: "text-negative ring-negative/40",
  unverified: "text-text-secondary ring-border/60"
};

const LABELS: Record<string, string> = {
  approved: "Verified",
  pending: "Pending",
  rejected: "Verify",
  unverified: "Verify"
};

export function KycBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? STYLES.unverified;
  const label = LABELS[status] ?? LABELS.unverified;

  return (
    <Link
      href="/kyc"
      aria-label="Identity verification status"
      className={`flex h-9 items-center gap-1.5 rounded-full bg-panel-2 px-3 text-xs font-semibold ring-1 transition-colors hover:brightness-110 ${style}`}
    >
      <ShieldIcon className="h-4 w-4" />
      {label}
    </Link>
  );
}
