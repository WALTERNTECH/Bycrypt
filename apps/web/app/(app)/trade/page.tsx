import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function TradePage() {
  const supabase = createClient();
  const { data: tiers } = await supabase
    .from("investment_tiers")
    .select("*")
    .eq("is_active", true)
    .order("lockup_days");

  return (
    <div className="px-4 pt-5 sm:px-6">
      <h1 className="text-lg font-bold text-text-primary">Choose your plan</h1>
      <p className="mt-1 text-xs text-text-secondary">
        Pick a lockup period and see the maximum return before you deposit.
      </p>

      <div className="mt-4 grid gap-3">
        {(tiers ?? []).map((tier) => (
          <Link
            key={tier.id}
            href={`/deposit?tier=${tier.id}`}
            className="flex items-center justify-between rounded-xl border border-border/60 bg-panel p-4 transition-colors hover:border-brand"
          >
            <div>
              <p className="text-sm font-bold text-text-primary">{tier.lockup_days}-day lockup</p>
              <p className="mt-0.5 text-xs text-text-secondary">Withdrawal unlocks at day {tier.lockup_days}</p>
            </div>
            <p className="mono-num text-lg font-extrabold text-positive">Up to {tier.max_return_pct}%</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
