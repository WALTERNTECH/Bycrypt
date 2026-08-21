import Link from "next/link";

export function KycPrompt({ status, action }: { status: string; action: "deposit" | "trade" }) {
  const pending = status === "pending";
  const rejected = status === "rejected";

  return (
    <div className="rounded-xl border border-border/60 bg-panel p-6 text-center">
      <p className="text-sm font-bold text-text-primary">
        {pending ? "Verification in review" : rejected ? "Verification needs another look" : "Verify your identity to continue"}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-text-secondary">
        {pending
          ? "We're reviewing your submission. This usually doesn't take long — you'll be notified the moment it's approved."
          : rejected
          ? "Your last submission wasn't approved. Resubmit your details and documents to continue."
          : `Krypton requires identity verification before you can ${action}. It only takes a minute.`}
      </p>
      {!pending && (
        <Link
          href="/kyc"
          className="mt-4 inline-block rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-base transition-colors hover:bg-brand-hover"
        >
          {rejected ? "Resubmit verification" : "Start verification"}
        </Link>
      )}
    </div>
  );
}
