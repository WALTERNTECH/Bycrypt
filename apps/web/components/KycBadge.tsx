import Link from "next/link";
import { ShieldCheckIcon, ClockIcon, AlertIcon, ShieldIcon } from "./icons";

// A real control in every state. "Verified" is a calm confirmation
// chip; the states that need action carry a filled, pressable button
// treatment so they read as the next step, not decoration.
const STYLES: Record<string, string> = {
  approved: "border-positive/30 bg-positive/10 text-positive shadow-none",
  pending: "border-brand/30 bg-brand/10 text-brand shadow-none",
  rejected:
    "border-[#C9384B] bg-gradient-to-b from-[#FF5D72] to-negative text-white shadow-btn-negative hover:from-[#FF7285] hover:to-[#F85068]",
  unverified:
    "border-[#C9990A] bg-gradient-to-b from-brand-hover to-brand text-ink shadow-btn-brand hover:from-[#FFD84D] hover:to-[#F7C21A]"
};

const LABELS: Record<string, string> = {
  approved: "Verified",
  pending: "In review",
  rejected: "Resubmit",
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
      className={`flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold transition-all duration-150 active:translate-y-px active:shadow-none ${style}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}
