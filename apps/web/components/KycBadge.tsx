import Link from "next/link";
import { ShieldCheckIcon, ClockIcon, AlertIcon, ShieldIcon } from "./icons";

// Sits on the white header, so every state is tuned for a light surface.
// The states that need action are filled and high-contrast; "Verified"
// is a calm confirmation rather than another competing CTA.
const STYLES: Record<string, string> = {
  approved: "border-positive/30 bg-positive/10 text-[#0A8F5C] shadow-sm",
  pending: "border-[#E0A800]/30 bg-brand/10 text-[#8A6D0A] shadow-sm",
  rejected:
    "border-[#C9384B] bg-gradient-to-b from-[#FF5D72] to-negative text-white shadow-btn-negative hover:from-[#FF7285] hover:to-[#F85068]",
  unverified:
    "border-[#C9990A] bg-gradient-to-b from-brand-hover to-brand text-ink shadow-btn-brand hover:from-[#FFD84D] hover:to-[#F7C21A]"
};

const LABELS: Record<string, string> = {
  approved: "Verified",
  pending: "In review",
  rejected: "Resubmit",
  unverified: "Verify"
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
      className={`flex h-10 items-center gap-1.5 rounded-xl border px-3 text-[13px] font-bold transition-all duration-150 active:translate-y-px active:shadow-none ${style}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
