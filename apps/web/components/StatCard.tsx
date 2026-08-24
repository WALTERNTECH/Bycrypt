export function StatCard({
  label,
  value,
  sub,
  tone = "default"
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "default" | "positive" | "negative" | "brand";
}) {
  const valueColor =
    tone === "positive"
      ? "text-positive"
      : tone === "negative"
      ? "text-negative"
      : tone === "brand"
      ? "text-brand"
      : "text-text-primary";

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-card sm:p-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">{label}</p>
      <p className={`mono-num mt-2 text-2xl font-extrabold ${valueColor}`}>{value}</p>
      {sub ? <p className="mt-1 text-xs text-text-secondary">{sub}</p> : null}
    </div>
  );
}
