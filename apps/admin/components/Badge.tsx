const styles: Record<string, string> = {
  positive: "bg-positive/10 text-positive",
  negative: "bg-negative/10 text-negative",
  brand: "bg-brand/10 text-brand",
  neutral: "bg-text-secondary/10 text-text-secondary"
};

export function Badge({
  children,
  tone = "neutral"
}: {
  children: React.ReactNode;
  tone?: "positive" | "negative" | "brand" | "neutral";
}) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${styles[tone]}`}>
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

