import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { TickerStrip } from "@/components/TickerStrip";
import { TierCard, type Tier } from "@/components/TierCard";

export const revalidate = 60;

export default async function HomePage() {
  const supabase = createClient();
  const [{ data: tiers }, { data: symbols }] = await Promise.all([
    supabase.from("investment_tiers").select("*").eq("is_active", true).order("lockup_days"),
    supabase.from("market_symbols").select("symbol, display_name").eq("is_active", true).order("sort_order")
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <TickerStrip rows={symbols ?? []} />

      {/* Hero */}
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center rounded-full border border-border/60 bg-panel px-3 py-1 text-xs font-medium text-text-secondary">
              Automated crypto trading & custody
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-text-primary sm:text-5xl">
              Deposit USDT. Choose a duration.
              <span className="text-brand"> Let the bot trade.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-text-secondary">
              Bycrypt allocates your deposit into automated, professionally managed trading for a
              fixed lockup period. No charts to read, no trades to place — just a transparent,
              capped return tied to real market performance.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="rounded-lg bg-brand px-6 py-3 text-sm font-bold text-base transition-colors hover:bg-brand-hover"
              >
                Get started
              </Link>
              <Link
                href="/markets"
                className="rounded-lg border border-border px-6 py-3 text-sm font-bold text-text-primary transition-colors hover:bg-panel"
              >
                View live markets
              </Link>
            </div>
            <p className="mt-6 text-xs text-text-secondary">
              Returns are variable, capped maximums — not guarantees. See tiers below.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-panel p-6">
            <p className="text-sm font-semibold text-text-primary">How a deposit becomes an investment</p>
            <ol className="mt-5 space-y-4 text-sm text-text-secondary">
              {[
                "Choose a lockup tier and see its maximum return upfront",
                "Send USDT (TRC20 / TRON) to Bycrypt's deposit address",
                "Submit your transaction hash for on-chain verification",
                "Once confirmed, the bot trades your allocation for the lockup period",
                "At maturity, request a withdrawal to your own wallet"
              ].map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Tiers */}
      <section id="tiers" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <h2 className="text-2xl font-bold text-text-primary">Investment tiers</h2>
        <p className="mt-2 max-w-2xl text-sm text-text-secondary">
          Pick a lockup period upfront and see the maximum return before you deposit. Longer
          lockups carry a higher capped return.
        </p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {(tiers ?? []).map((tier: Tier, i: number) => (
            <TierCard key={tier.id} tier={tier} featured={i === 2} />
          ))}
        </div>
      </section>

      {/* How it works detail */}
      <section id="how-it-works" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-panel p-6">
            <p className="text-sm font-semibold text-brand">Live markets</p>
            <p className="mt-2 text-sm text-text-secondary">
              Real-time crypto prices and interactive charts, updating live — no delays, no
              guesswork.
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-panel p-6">
            <p className="text-sm font-semibold text-brand">On-chain verified deposits</p>
            <p className="mt-2 text-sm text-text-secondary">
              Every deposit is verified directly against the TRON blockchain before your
              investment activates.
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-panel p-6">
            <p className="text-sm font-semibold text-brand">Transparent tracking</p>
            <p className="mt-2 text-sm text-text-secondary">
              Watch your maturity date and accrued return from your dashboard at any time.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
