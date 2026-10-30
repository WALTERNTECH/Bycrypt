import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/Badge";
import { LiveInvestmentValue } from "@/components/LiveInvestmentValue";
import { ClosePositionButton } from "@/components/ClosePositionButton";
import { SettlementValue } from "@/components/SettlementValue";
import { BulkCloseBar } from "@/components/BulkCloseBar";
import { PageTail } from "@/components/PageTail";
import { ButtonLink } from "@/components/ui";
import { RiskNotice } from "@/components/RiskNotice";
import { formatUsdt, formatPct, formatDate } from "@/lib/format";
import { mapPositionRow } from "@/lib/position";

export default async function InvestmentsPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: investments } = await supabase
    .from("investments")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  const rows = investments ?? [];
  const open = rows.filter((i) => i.status !== "withdrawn");
  const closed = rows.filter((i) => i.status === "withdrawn");

  return (
    <div className="px-4 pt-4 sm:px-6">
      <h1 className="text-xl font-extrabold text-text-primary">Positions</h1>

      <div className="mt-4">
        <BulkCloseBar />
      </div>

      {rows.length === 0 && (
        <div className="mt-4 rounded-lg bg-surface-2 p-8 text-center">
          <p className="text-sm font-bold text-text-primary">No positions yet</p>
          <p className="mt-1.5 text-xs text-text-secondary">
            Fund your wallet, then open one from any market chart.
          </p>
          <div className="mt-4 flex justify-center">
            <ButtonLink href="/trade" variant="primary" size="md">
              Browse markets
            </ButtonLink>
          </div>
        </div>
      )}

      {open.length > 0 && (
        <section className="mt-5">
          <h2 className="text-[13px] font-bold text-text-primary">Open</h2>
          <div className="mt-2 space-y-5">
            {open.map((inv) => (
              <PositionRow key={inv.id} inv={inv} />
            ))}
          </div>
        </section>
      )}

      {closed.length > 0 && (
        <section className="mt-7">
          <h2 className="text-[13px] font-bold text-text-primary">History</h2>
          <div className="mt-2 space-y-5">
            {closed.map((inv) => (
              <PositionRow key={inv.id} inv={inv} />
            ))}
          </div>
        </section>
      )}

      <PageTail variant="positions" />
      <RiskNotice />
    </div>
  );
}

function PositionRow({ inv }: { inv: any }) {
  const row = mapPositionRow(inv);
  const isOpen = inv.status !== "withdrawn";
  const finalPct = row.principal > 0 ? (row.accrued / row.principal) * 100 : 0;
  const won = row.accrued >= 0;

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-bold text-text-primary">
            {row.symbol ? row.symbol.replace("USDT", "/USDT") : "Position"}
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                row.side === "SELL" ? "bg-negative-dim text-negative" : "bg-positive-dim text-positive"
              }`}
            >
              {row.side}
            </span>
            {row.timeframe && (
              <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold text-text-secondary">
                {row.timeframe}
              </span>
            )}
          </p>
          <p className="mt-0.5 text-[10px] text-text-tertiary">
            Opened {formatDate(row.startedAt)}
            {row.targetGainPct !== null && <> · target +{row.targetGainPct}%</>}
            {!isOpen && inv.closed_at && <> · closed {formatDate(inv.closed_at)}</>}
          </p>
        </div>
        <StatusBadge status={inv.status} />
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-2">
        <Cell label="Invested" value={formatUsdt(row.principal, { withSymbol: true })} />

        <div className="rounded-lg bg-surface-2 px-3 py-2.5">
          <p className="text-[10px] font-medium text-text-tertiary">
            {isOpen ? "Live value" : "Final value"}
          </p>
          {isOpen && row.symbol ? (
            <LiveInvestmentValue row={row} />
          ) : (
            <p className="mono-num mt-1 text-sm font-bold text-text-primary">
              {formatUsdt(row.principal + row.accrued, { withSymbol: true })}
            </p>
          )}
        </div>

        <div className="rounded-lg bg-surface-2 px-3 py-2.5">
          <p className="text-[10px] font-medium text-text-tertiary">
            {isOpen ? "Settles at" : won ? "Gain" : "Loss"}
          </p>
          {isOpen ? (
            <SettlementValue row={row} />
          ) : (
            <>
              <p className="mono-num mt-1 text-sm font-bold text-text-primary">
                {formatUsdt(Math.abs(row.accrued), { withSymbol: true })}
              </p>
              <p className={`mono-num text-[10px] font-bold ${won ? "text-positive" : "text-negative"}`}>
                {formatPct(finalPct, { signed: true })}
              </p>
            </>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="mt-2.5">
          <ClosePositionButton row={row} />
        </div>
      )}
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-2.5">
      <p className="text-[10px] font-medium text-text-tertiary">{label}</p>
      <p className="mono-num mt-1 text-sm font-bold text-text-primary">{value}</p>
    </div>
  );
}
