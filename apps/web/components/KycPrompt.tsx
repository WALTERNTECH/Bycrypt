import { ButtonLink } from "./ui";
import { ShieldIcon, ClockIcon, AlertIcon } from "./icons";

export function KycPrompt({ status, action }: { status: string; action: "deposit" | "trade" }) {
  const pending = status === "pending";
  const rejected = status === "rejected";
  const Icon = pending ? ClockIcon : rejected ? AlertIcon : ShieldIcon;

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 text-center shadow-card">
      <div
        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border ${
          pending
            ? "border-brand/30 bg-brand/10 text-brand"
            : rejected
            ? "border-negative/30 bg-negative/10 text-negative"
            : "border-brand/30 bg-brand/10 text-brand"
        }`}
      >
        <Icon className="h-6 w-6" />
      </div>

      <p className="mt-3 text-sm font-bold text-text-primary">
        {pending ? "Verification in review" : rejected ? "Verification needs another look" : "Verify your identity"}
      </p>
      <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-text-secondary">
        {pending
          ? "Your submission is being checked. This usually doesn't take long — you'll be notified the moment it's approved."
          : rejected
          ? "Your last submission wasn't approved. Resubmit your details and documents to continue."
          : `Krypton requires identity verification before you can ${action}. It only takes a minute.`}
      </p>

      {!pending && (
        <div className="mt-4 flex justify-center">
          <ButtonLink href="/kyc" variant="primary" size="md">
            {rejected ? "Resubmit verification" : "Start verification"}
          </ButtonLink>
        </div>
      )}
    </div>
  );
}
