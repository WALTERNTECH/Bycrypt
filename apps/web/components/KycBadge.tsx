import Link from "next/link";
import { ShieldCheckIcon, ClockIcon, AlertIcon, ShieldIcon } from "./icons";

// Solid, high-contrast per-status styling — this is a real call-to-action
// button, not a subtle label, so every state uses a filled background.
const STYLES: Record<string, string> = {
  approved: "bg-positive text-base shadow-positive/25 ring-white/10",
  pending: "bg-panel-2 text-brand shadow-none ring-brand/40",
  rejected: "bg-negative text-white shadow-negative/25 ring-white/10",
  unverified: "bg-brand text-base shadow-brand/30 ring-white/10"
};

const LABELS: Record<string, string> = {
  approved: "Verified",
  pending: "Pending",
  rejected: "Resubmit KYC",
  unverified: "Verify ID"
};

const ICONS: Record<string, typeof ShieldIcon> = {
  approved: ShieldCheckIcon,
  pending: ClockIcon,
  rejected: AlertIcon,
  unverified: ShieldIcon
};

export function KycBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? STYLES.unverified;
  const label = LABELS[status] ?? LABELS.unverified;
  const Icon = ICONS[status] ?? ShieldIcon;

  return (
    <Link
      href="/kyc"
      aria-label="Identity verification status"
      className={`flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-extrabold shadow-md ring-1 transition-transform hover:scale-105 active:scale-95 ${style}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}
