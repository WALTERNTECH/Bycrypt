import { createClient } from "@/lib/supabase/server";
import { formatUsdt } from "@/lib/format";
import { StatementActions } from "./StatementActions";

export const dynamic = "force-dynamic";

/**
 * The account statement.
 *
 * Every figure on this page is drawn from a record of something that
 * actually happened: a confirmed on-chain deposit, a position that was
 * opened, a position that was closed and paid out. Nothing is projected
 * and nothing is modelled — a statement that forecasts is a marketing
 * document, and this one has to be the opposite of that.
 *
 * Month-to-date is shown because it is a fact. A month-end estimate is
 * not shown, because it would be a guess presented in the one format
 * people are most likely to trust.
 */
export default async function StatementPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [{ data: profile }, { data: deposits }, { data: investments }, { data: withdrawals }] =
    await Promise.all([
      supabase.from("profiles").select("full_name, wallet_balance").eq("id", user!.id).single(),
      supabase
        .from("deposits")
        .select("amount, asset_amount, rate_usd, confirmed_at, status")
        .eq("user_id", user!.id)
        .eq("status", "confirmed")
        .gte("confirmed_at", startOfMonth)
        .order("confirmed_at", { ascending: false }),
      supabase
        .from("investments")
        .select("amount, accrued_return, traded_symbol, status, start_date, entry_price")
        .eq("user_id", user!.id)
        .gte("start_date", startOfMonth)
        .order("start_date", { ascending: false }),
      supabase
        .from("withdrawals")
        .select("amount, status, requested_at")
        .eq("user_id", user!.id)
        .gte("requested_at", startOfMonth)
    ]);

  const num = (v: unknown) => (v === null || v === undefined ? 0 : parseFloat(String(v)));

  const closed = (investments ?? []).filter((i) => i.status === "withdrawn");
  const open = (investments ?? []).filter((i) => i.status !== "withdrawn");

  const inDay = (iso: string | null) => !!iso && iso >= startOfDay;

  const realisedMonth = closed.reduce((t, i) => t + num(i.accrued_return), 0);
  const realisedToday = closed.filter((i) => inDay(i.start_date)).reduce((t, i) => t + num(i.accrued_return), 0);
  const depositedMonth = (deposits ?? []).reduce((t, d) => t + num(d.amount), 0);
  const depositedToday = (deposits ?? []).filter((d) => inDay(d.confirmed_at)).reduce((t, d) => t + num(d.amount), 0);
  const investedOpen = open.reduce((t, i) => t + num(i.amount), 0);

  const rows = [
    ...(deposits ?? []).map((d) => ({
      when: d.confirmed_at as string,
      kind: "Deposit",
      detail:
        d.asset_amount && d.rate_usd
          ? `${Number(d.asset_amount).toFixed(8)} BTC @ $${Number(d.rate_usd).toLocaleString()}`
          : "Confirmed on-chain",
      value: num(d.amount)
    })),
    ...closed.map((i) => ({
      when: i.start_date as string,
      kind: "Position closed",
      detail: `${(i.traded_symbol ?? "").replace("USDT", "")} · invested ${formatUsdt(num(i.amount), { withSymbol: true })}`,
      value: num(i.accrued_return)
    })),
    ...open.map((i) => ({
      when: i.start_date as string,
      kind: "Position opened",
      detail: `${(i.traded_symbol ?? "").replace("USDT", "")} · open`,
      value: -num(i.amount)
    }))
  ].sort((a, b) => (a.when < b.when ? 1 : -1));

  const monthName = now.toLocaleString(undefined, { month: "long", year: "numeric" });
  const generated = now.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="px-4 pt-4 sm:px-6">
      <div className="flex items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-[17px] font-bold text-text-primary">Statement</h1>
          <p className="mt-0.5 text-[12px] text-text-secondary">{monthName} · month to date</p>
        </div>
        <StatementActions />
      </div>

      {/* The printed sheet. On screen it is a card; on paper it is the
          whole document, which is why the header below only appears in
          print — the app chrome is hidden there. */}
      <article id="krypton-statement" className="mt-4 rounded-lg bg-surface-2 print:rounded-none print:border-0">
        <header className="hidden border-b border-border px-5 py-4 print:block">
          <p className="text-[18px] font-extrabold tracking-tight text-text-primary">Krypton</p>
          <p className="mt-0.5 text-[11px] text-text-secondary">
            Account statement · {monthName} · generated {generated}
          </p>
          <p className="mt-1 text-[12px] font-semibold text-text-primary">
            {profile?.full_name ?? user?.email}
          </p>
        </header>

        <div className="grid grid-cols-2 border-b border-border sm:grid-cols-4">
          <Stat label="Deposited today" value={formatUsdt(depositedToday, { withSymbol: true })} />
          <Stat
            label="Realised today"
            value={formatUsdt(realisedToday, { withSymbol: true })}
            tone={realisedToday > 0 ? "up" : undefined}
          />
          <Stat label="Deposited this month" value={formatUsdt(depositedMonth, { withSymbol: true })} />
          <Stat
            label="Realised this month"
            value={formatUsdt(realisedMonth, { withSymbol: true })}
            tone={realisedMonth > 0 ? "up" : undefined}
          />
        </div>

        <div className="grid grid-cols-2 border-b border-border">
          <Stat label="Wallet balance" value={formatUsdt(num(profile?.wallet_balance), { withSymbol: true })} strong />
          <Stat label="Currently invested" value={formatUsdt(investedOpen, { withSymbol: true })} strong />
        </div>

        <div className="px-5 py-4">
          <p className="text-[12px] font-semibold text-text-primary">Activity</p>
          {rows.length === 0 ? (
            <p className="mt-2 text-[12px] text-text-tertiary">No activity this month.</p>
          ) : (
            <table className="mt-2 w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-text-tertiary">
                  <th className="pb-1.5 font-medium">Date</th>
                  <th className="pb-1.5 font-medium">Type</th>
                  <th className="hidden pb-1.5 font-medium sm:table-cell">Detail</th>
                  <th className="pb-1.5 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="">
                    <td className="py-2 text-[12px] text-text-secondary">
                      {new Date(r.when).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}
                    </td>
                    <td className="py-2 text-[12px] font-medium text-text-primary">{r.kind}</td>
                    <td className="hidden py-2 text-[12px] text-text-tertiary sm:table-cell">{r.detail}</td>
                    <td
                      className={`mono-num py-2 text-right text-[12px] font-semibold ${
                        r.value > 0 ? "text-positive" : r.value < 0 ? "text-text-primary" : "text-text-secondary"
                      }`}
                    >
                      {r.value > 0 ? "+" : ""}
                      {formatUsdt(r.value, { withSymbol: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <footer className=" px-5 py-3">
          <p className="text-[10px] leading-relaxed text-text-tertiary">
            Figures reflect recorded account activity as at {generated}. Open positions are valued at the
            current market price and will change. Past performance does not indicate future results, and no
            figure here is a forecast.
          </p>
        </footer>
      </article>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  strong
}: {
  label: string;
  value: string;
  tone?: "up";
  strong?: boolean;
}) {
  return (
    <div className="border-r border-border px-4 py-3 last:border-r-0">
      <p className="text-[10px] uppercase tracking-wide text-text-tertiary">{label}</p>
      <p
        className={`mono-num mt-1 ${strong ? "text-[15px] font-bold" : "text-[14px] font-semibold"} ${
          tone === "up" ? "text-positive" : "text-text-primary"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
