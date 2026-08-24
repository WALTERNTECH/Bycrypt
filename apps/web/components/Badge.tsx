const styles: Record<string, string> = {
  positive: "border-positive/30 bg-positive/10 text-positive",
  negative: "border-negative/30 bg-negative/10 text-negative",
  brand: "border-brand/30 bg-brand/10 text-brand",
  neutral: "border-border-strong bg-surface-2 text-text-secondary"
};

export function Badge({
  children,
  tone = "neutral"
}: {
  children: React.ReactNode;
  tone?: "positive" | "negative" | "brand" | "neutral";
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

const statusTone: Record<string, "positive" | "negative" | "brand" | "neutral"> = {
  active: "brand",
  matured: "positive",
  withdrawn: "neutral",
  pending: "brand",
  pending_verification: "brand",
  confirmed: "positive",
  rejected: "negative",
  approved: "positive",
  processed: "positive",
  suspended: "negative",
  deactivated: "negative"
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTone[status] ?? "neutral"}>{status.replace(/_/g, " ")}</Badge>;
}
