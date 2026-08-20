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
    <div className="rounded-xl border border-border/60 bg-panel p-4 sm:p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">{label}</p>
      <p className={`mono-num mt-2 text-2xl font-bold ${valueColor}`}>{value}</p>
      {sub ? <p className="mt-1 text-xs text-text-secondary">{sub}</p> : null}
    </div>
  );
}
