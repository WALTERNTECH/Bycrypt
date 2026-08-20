import Link from "next/link";

export interface Tier {
  id: number;
  name: string;
  lockup_days: number;
  max_return_pct: number;
}

export function TierCard({ tier, featured = false }: { tier: Tier; featured?: boolean }) {
  return (
    <div
      className={`flex flex-col rounded-xl border p-6 transition-colors ${
        featured ? "border-brand bg-panel" : "border-border/60 bg-panel hover:border-border"
      }`}
    >
      {featured && (
        <span className="mb-3 inline-flex w-fit items-center rounded-md bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
          Most popular
        </span>
      )}
      <p className="text-sm font-medium text-text-secondary">{tier.lockup_days}-day lockup</p>
      <p className="mono-num mt-1 text-3xl font-extrabold text-positive">
        Up to {tier.max_return_pct}%
      </p>
      <p className="mt-1 text-xs text-text-secondary">Variable, market-dependent return</p>
      <ul className="mt-5 space-y-2 text-sm text-text-secondary">
        <li>• Withdrawal unlocks at day {tier.lockup_days}</li>
        <li>• Returns accrue from bot trading performance</li>
        <li>• Capped maximum — never guaranteed</li>
      </ul>
      <Link
        href="/signup"
        className="mt-6 rounded-lg bg-brand py-2.5 text-center text-sm font-bold text-base transition-colors hover:bg-brand-hover"
      >
        Choose {tier.name}
      </Link>
    </div>
  );
}
