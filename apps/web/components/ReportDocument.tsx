import type { ReportData, ReportPosition } from "@/lib/report";

/**
 * The Krypton report document.
 *
 * Laid out for ImageResponse, which supports a flexbox subset and
 * rasterises server-side — so every element needs an explicit display,
 * and the chart is built from columns rather than an SVG path because
 * boxes are the part of this engine that renders with certainty.
 *
 * Kept apart from the route so it can be rendered without a session.
 */

const INK = "#121214";
const MUTED = "#6B7079";
const SOFT = "#9AA0A8";
const LINE = "#EAECEF";
const PANEL = "#F7F7F8";
const BRAND = "#F7A600";
const UP = "#20B26C";
const DOWN = "#EF454A";

const money = (n: number, dp = 2) =>
  (n < 0 ? "-" : "") +
  "$" +
  Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });

const compact = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (a >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  return money(n);
};

const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

export function Report({ r }: { r: ReportData }) {
  const profitUp = r.netProfit >= 0;

  return (
    <div
      style={{
        width: "1200px",
        height: "1700px",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#FFFFFF",
        padding: "44px 48px",
        fontFamily: "Inter",
        color: INK
      }}
    >
      {/* ---------------- header ---------------- */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              width: "44px",
              height: "44px",
              borderRadius: "11px",
              backgroundColor: BRAND,
              alignItems: "center",
              justifyContent: "center",
              fontSize: "26px",
              fontWeight: 800,
              color: INK
            }}
          >
            K
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginLeft: "14px" }}>
            <div style={{ fontSize: "26px", fontWeight: 800 }}>Krypton Report</div>
            <div style={{ fontSize: "15px", color: MUTED, marginTop: "3px" }}>
              {r.accountName} · {r.accountEmail}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <div style={{ fontSize: "13px", color: SOFT }}>Generated</div>
          <div style={{ fontSize: "16px", fontWeight: 700, marginTop: "3px" }}>
            {dateTime(r.generatedAt)}
          </div>
          {r.simulated && (
            <div
              style={{
                display: "flex",
                marginTop: "8px",
                backgroundColor: INK,
                color: "#FFFFFF",
                fontSize: "12px",
                fontWeight: 700,
                padding: "5px 11px",
                borderRadius: "999px"
              }}
            >
              SIMULATED TEST ACCOUNT — FIGURES ARE NOT REAL
            </div>
          )}
        </div>
      </div>

      {/* ---------------- headline numbers ---------------- */}
      <div style={{ display: "flex", marginTop: "30px" }}>
        <Stat label="Total assets" value={money(r.totalAssets)} big />
        <Stat label="Deposited" value={money(r.totalDeposited)} />
        <Stat label="Withdrawn" value={money(r.totalWithdrawn)} />
        <Stat
          label="Net profit"
          value={money(r.netProfit)}
          tone={profitUp ? UP : DOWN}
          sub={r.totalDeposited > 0 ? pct(r.netProfitPct) : undefined}
          big
        />
      </div>

      <div
        style={{
          display: "flex",
          marginTop: "12px",
          fontSize: "13px",
          color: SOFT
        }}
      >
        Net profit = total assets now ({money(r.totalAssets)}) + withdrawn ({money(r.totalWithdrawn)}) −
        deposited ({money(r.totalDeposited)})
      </div>

      {/* ---------------- balance history ---------------- */}
      <SectionTitle>Balance history</SectionTitle>
      <BalanceChart r={r} />

      {/* ---------------- split: positions + transactions ---------------- */}
      <div style={{ display: "flex", marginTop: "26px" }}>
        <div style={{ display: "flex", flexDirection: "column", width: "700px" }}>
          <div style={{ fontSize: "19px", fontWeight: 800, marginBottom: "12px" }}>
            Open positions
          </div>
          {r.openPositions.length === 0 ? (
            <Empty>No positions are open.</Empty>
          ) : (
            <PositionTable rows={r.openPositions} open />
          )}

          <div style={{ fontSize: "19px", fontWeight: 800, margin: "24px 0 12px" }}>
            Closed positions
          </div>
          {r.closedPositions.length === 0 ? (
            <Empty>Nothing closed yet.</Empty>
          ) : (
            <PositionTable rows={r.closedPositions.slice(0, 7)} />
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", width: "360px", marginLeft: "44px" }}>
          <div style={{ fontSize: "19px", fontWeight: 800, marginBottom: "12px" }}>
            Transaction history
          </div>
          {r.transactions.length === 0 ? (
            <Empty>No deposits or withdrawals.</Empty>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {r.transactions.slice(0, 8).map((t, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "11px 0",
                    borderBottom: `1px solid ${LINE}`
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ fontSize: "15px", fontWeight: 700 }}>
                      {t.kind === "deposit" ? "Deposit" : "Withdrawal"}
                    </div>
                    <div style={{ fontSize: "12px", color: SOFT, marginTop: "2px" }}>
                      {dateTime(t.at)}
                      {t.status !== "confirmed" && t.status !== "completed" ? ` · ${t.status}` : ""}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: 700,
                      color: t.kind === "deposit" ? UP : INK
                    }}
                  >
                    {t.kind === "deposit" ? "+" : "−"}
                    {money(t.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: "26px",
              backgroundColor: PANEL,
              borderRadius: "12px",
              padding: "18px"
            }}
          >
            <div style={{ fontSize: "15px", fontWeight: 800, marginBottom: "10px" }}>Breakdown</div>
            <Line label="Wallet" value={money(r.wallet)} />
            <Line label="In positions" value={money(r.inPositions)} />
            <Line label="Realised P&L" value={money(r.realised)} tone={r.realised >= 0 ? UP : DOWN} />
            <Line
              label="Unrealised P&L"
              value={money(r.unrealised)}
              tone={r.unrealised >= 0 ? UP : DOWN}
            />
            <div style={{ display: "flex", height: "1px", backgroundColor: LINE, margin: "9px 0" }} />
            <Line label="Total assets" value={money(r.totalAssets)} bold />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1 }} />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          borderTop: `1px solid ${LINE}`,
          paddingTop: "16px",
          fontSize: "12px",
          color: SOFT
        }}
      >
        <div style={{ display: "flex" }}>
          Krypton · figures as at {dateTime(r.generatedAt)}. Open positions are valued at the market
          at that moment and will have moved since.
        </div>
        <div style={{ display: "flex" }}>krypton.app</div>
      </div>
    </div>
  );
}

/* ---------------- pieces ---------------- */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", fontSize: "19px", fontWeight: 800, margin: "30px 0 12px" }}>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        backgroundColor: PANEL,
        borderRadius: "12px",
        padding: "22px",
        fontSize: "14px",
        color: MUTED
      }}
    >
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
  big
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: string;
  big?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", marginRight: "56px" }}>
      <div style={{ fontSize: "14px", color: MUTED }}>{label}</div>
      <div
        style={{
          fontSize: big ? "40px" : "30px",
          fontWeight: 800,
          marginTop: "6px",
          color: tone ?? INK
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: "15px", fontWeight: 700, marginTop: "3px", color: tone ?? MUTED }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function Line({
  label,
  value,
  tone,
  bold
}: {
  label: string;
  value: string;
  tone?: string;
  bold?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
      <div style={{ fontSize: "14px", color: bold ? INK : MUTED, fontWeight: bold ? 700 : 400 }}>
        {label}
      </div>
      <div style={{ fontSize: "14px", fontWeight: 700, color: tone ?? INK }}>{value}</div>
    </div>
  );
}

function BalanceChart({ r }: { r: ReportData }) {
  const values = r.balanceHistory.map((p) => p.value);
  const max = Math.max(...values, 1);
  const min = 0;
  const height = 210;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: PANEL,
        borderRadius: "14px",
        padding: "22px 24px"
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline" }}>
        <div style={{ fontSize: "34px", fontWeight: 800 }}>{compact(r.totalAssets)}</div>
        <div
          style={{
            fontSize: "16px",
            fontWeight: 700,
            marginLeft: "12px",
            color: r.netProfit >= 0 ? UP : DOWN
          }}
        >
          {money(r.netProfit)} all time
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", height: `${height}px`, marginTop: "16px" }}>
        {/* y axis */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            height: `${height}px`,
            width: "86px",
            fontSize: "12px",
            color: SOFT
          }}
        >
          <div style={{ display: "flex" }}>{compact(max)}</div>
          <div style={{ display: "flex" }}>{compact(max * 0.66)}</div>
          <div style={{ display: "flex" }}>{compact(max * 0.33)}</div>
          <div style={{ display: "flex" }}>{compact(min)}</div>
        </div>

        {/* Columns rather than a path: this layout engine renders boxes
            with certainty, and at this density the series still reads as
            a continuous area. */}
        <div style={{ display: "flex", alignItems: "flex-end", height: `${height}px`, flex: 1 }}>
          {r.balanceHistory.map((p, i) => {
            const h = Math.max(2, Math.round((p.value / max) * height));
            const last = i === r.balanceHistory.length - 1;
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  flex: 1,
                  height: `${h}px`,
                  marginLeft: "2px",
                  borderRadius: "3px 3px 0 0",
                  backgroundColor: last ? BRAND : "#C9D3E8"
                }}
              />
            );
          })}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginLeft: "86px",
          marginTop: "9px",
          fontSize: "12px",
          color: SOFT
        }}
      >
        <div style={{ display: "flex" }}>
          {r.balanceHistory.length > 0 ? shortDate(new Date(r.balanceHistory[0].t).toISOString()) : ""}
        </div>
        <div style={{ display: "flex" }}>Today</div>
      </div>
    </div>
  );
}

function PositionTable({ rows, open }: { rows: ReportPosition[]; open?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          fontSize: "12px",
          color: SOFT,
          paddingBottom: "8px",
          borderBottom: `1px solid ${LINE}`
        }}
      >
        <div style={{ display: "flex", width: "150px" }}>Market</div>
        <div style={{ display: "flex", width: "110px" }}>Staked</div>
        <div style={{ display: "flex", width: "110px" }}>Entry</div>
        <div style={{ display: "flex", width: "110px" }}>{open ? "Now" : "Exit"}</div>
        <div style={{ display: "flex", width: "110px" }}>Value</div>
        <div style={{ display: "flex", flex: 1, justifyContent: "flex-end" }}>
          {open ? "Unrealised" : "Result"}
        </div>
      </div>

      {rows.map((p, i) => {
        const up = p.pnl >= 0;
        const price = (v: number | null) =>
          v === null ? "—" : v >= 100 ? v.toFixed(2) : v.toFixed(6);
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 0",
              borderBottom: `1px solid ${LINE}`
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", width: "150px" }}>
              <div style={{ fontSize: "15px", fontWeight: 700 }}>
                {p.symbol.replace("USDT", "")}
                <span style={{ color: SOFT, fontWeight: 400 }}>/USDT</span>
              </div>
              <div style={{ fontSize: "11px", color: SOFT, marginTop: "2px" }}>
                {p.side}
                {p.timeframe ? ` · ${p.timeframe}` : ""} · {shortDate(p.openedAt)}
              </div>
            </div>
            <div style={{ display: "flex", width: "110px", fontSize: "14px" }}>{money(p.staked)}</div>
            <div style={{ display: "flex", width: "110px", fontSize: "14px", color: MUTED }}>
              {price(p.entryPrice)}
            </div>
            <div style={{ display: "flex", width: "110px", fontSize: "14px", color: MUTED }}>
              {price(p.livePrice)}
            </div>
            <div style={{ display: "flex", width: "110px", fontSize: "14px", fontWeight: 700 }}>
              {money(p.value)}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                alignItems: "flex-end"
              }}
            >
              <div style={{ fontSize: "15px", fontWeight: 800, color: up ? UP : DOWN }}>
                {up ? "+" : "−"}
                {money(Math.abs(p.pnl))}
              </div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: up ? UP : DOWN }}>
                {pct(p.pnlPct)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
