import type { ReportData, ReportPosition } from "@/lib/report";

/**
 * The Krypton report document.
 *
 * Laid out for ImageResponse, which rasterises a flexbox subset
 * server-side. That engine has one rule worth stating up front, because
 * breaking it fails the whole render rather than one element: a div with
 * more than one child must declare display explicitly. Interpolated text
 * counts — `{name} · {email}` is two children, not one string.
 *
 * So everything here follows one discipline: every div carries an explicit
 * display, and any text built from more than one value is composed into a
 * single string before it gets near the markup. The Txt helper exists to
 * make that the path of least resistance rather than something to
 * remember.
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
  if (a >= 1_000_000) return `${n < 0 ? "-" : ""}$${(Math.abs(n) / 1_000_000).toFixed(2)}M`;
  if (a >= 1_000) return `${n < 0 ? "-" : ""}$${(Math.abs(n) / 1_000).toFixed(1)}K`;
  return money(n, 0);
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

const price = (v: number | null) => (v === null ? "—" : v >= 100 ? v.toFixed(2) : v.toFixed(6));

/** A single run of text. Always one child, always an explicit display. */
function Txt({
  children,
  size = 14,
  weight = 400,
  color = INK,
  style
}: {
  children: string;
  size?: number;
  weight?: 400 | 700;
  color?: string;
  style?: Record<string, string | number>;
}) {
  return (
    <div
      style={{
        display: "flex",
        fontSize: `${size}px`,
        fontWeight: weight,
        color,
        ...(style ?? {})
      }}
    >
      {children}
    </div>
  );
}

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
              width: "46px",
              height: "46px",
              borderRadius: "12px",
              backgroundColor: BRAND,
              alignItems: "center",
              justifyContent: "center",
              fontSize: "27px",
              fontWeight: 700,
              color: INK
            }}
          >
            K
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginLeft: "14px" }}>
            <Txt size={27} weight={700}>
              Krypton Report
            </Txt>
            <Txt size={15} color={MUTED} style={{ marginTop: "3px" }}>
              {`${r.accountName} · ${r.accountEmail}`}
            </Txt>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <Txt size={13} color={SOFT}>
            Generated
          </Txt>
          <Txt size={16} weight={700} style={{ marginTop: "3px" }}>
            {dateTime(r.generatedAt)}
          </Txt>
          {r.simulated && (
            <Txt
              size={12}
              weight={700}
              color="#FFFFFF"
              style={{
                marginTop: "9px",
                backgroundColor: INK,
                padding: "5px 11px",
                borderRadius: "999px"
              }}
            >
              SIMULATED TEST ACCOUNT — FIGURES ARE NOT REAL
            </Txt>
          )}
        </div>
      </div>

      {/* ---------------- headline numbers ---------------- */}
      <div style={{ display: "flex", marginTop: "32px" }}>
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

      <Txt size={13} color={SOFT} style={{ marginTop: "14px" }}>
        {`Net profit = total assets now ${money(r.totalAssets)} + withdrawn ${money(
          r.totalWithdrawn
        )} − deposited ${money(r.totalDeposited)}`}
      </Txt>

      {/* ---------------- balance history ---------------- */}
      <Txt size={19} weight={700} style={{ margin: "30px 0 12px" }}>
        Balance history
      </Txt>
      <BalanceChart r={r} />

      {/* ---------------- positions + transactions ---------------- */}
      <div style={{ display: "flex", marginTop: "28px" }}>
        <div style={{ display: "flex", flexDirection: "column", width: "700px" }}>
          <Txt size={19} weight={700} style={{ marginBottom: "12px" }}>
            Open positions
          </Txt>
          {r.openPositions.length === 0 ? (
            <Empty>No positions are open.</Empty>
          ) : (
            <PositionTable rows={r.openPositions} open />
          )}

          <Txt size={19} weight={700} style={{ margin: "26px 0 12px" }}>
            Closed positions
          </Txt>
          {r.closedPositions.length === 0 ? (
            <Empty>Nothing closed yet.</Empty>
          ) : (
            <PositionTable rows={r.closedPositions.slice(0, 6)} />
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", width: "360px", marginLeft: "44px" }}>
          <Txt size={19} weight={700} style={{ marginBottom: "12px" }}>
            Transaction history
          </Txt>
          {r.transactions.length === 0 ? (
            <Empty>No deposits or withdrawals.</Empty>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {r.transactions.slice(0, 7).map((t, i) => (
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
                    <Txt size={15} weight={700}>
                      {t.kind === "deposit" ? "Deposit" : "Withdrawal"}
                    </Txt>
                    <Txt size={12} color={SOFT} style={{ marginTop: "2px" }}>
                      {t.status === "confirmed" || t.status === "completed"
                        ? dateTime(t.at)
                        : `${dateTime(t.at)} · ${t.status}`}
                    </Txt>
                  </div>
                  <Txt size={16} weight={700} color={t.kind === "deposit" ? UP : INK}>
                    {`${t.kind === "deposit" ? "+" : "−"}${money(t.amount)}`}
                  </Txt>
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
            <Txt size={15} weight={700} style={{ marginBottom: "10px" }}>
              Breakdown
            </Txt>
            <Line label="Wallet" value={money(r.wallet)} />
            <Line label="In positions" value={money(r.inPositions)} />
            <Line label="Realised P&L" value={money(r.realised)} tone={r.realised >= 0 ? UP : DOWN} />
            <Line
              label="Unrealised P&L"
              value={money(r.unrealised)}
              tone={r.unrealised >= 0 ? UP : DOWN}
            />
            <div style={{ display: "flex", height: "1px", backgroundColor: LINE, margin: "10px 0" }} />
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
          paddingTop: "16px"
        }}
      >
        <Txt size={12} color={SOFT}>
          {`Krypton · figures as at ${dateTime(
            r.generatedAt
          )}. Open positions are valued at the market at that moment and will have moved since.`}
        </Txt>
      </div>
    </div>
  );
}

/* ---------------- pieces ---------------- */

function Empty({ children }: { children: string }) {
  return (
    <Txt
      size={14}
      color={MUTED}
      style={{ backgroundColor: PANEL, borderRadius: "12px", padding: "22px" }}
    >
      {children}
    </Txt>
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
    <div style={{ display: "flex", flexDirection: "column", marginRight: "58px" }}>
      <Txt size={14} color={MUTED}>
        {label}
      </Txt>
      <Txt size={big ? 40 : 30} weight={700} color={tone ?? INK} style={{ marginTop: "6px" }}>
        {value}
      </Txt>
      {sub && (
        <Txt size={15} weight={700} color={tone ?? MUTED} style={{ marginTop: "3px" }}>
          {sub}
        </Txt>
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
      <Txt size={14} weight={bold ? 700 : 400} color={bold ? INK : MUTED}>
        {label}
      </Txt>
      <Txt size={14} weight={700} color={tone ?? INK}>
        {value}
      </Txt>
    </div>
  );
}

function BalanceChart({ r }: { r: ReportData }) {
  const values = r.balanceHistory.map((p) => p.value);
  const max = Math.max(...values, 1);
  const height = 200;

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
        <Txt size={34} weight={700}>
          {compact(r.totalAssets)}
        </Txt>
        <Txt
          size={16}
          weight={700}
          color={r.netProfit >= 0 ? UP : DOWN}
          style={{ marginLeft: "12px" }}
        >
          {`${money(r.netProfit)} all time`}
        </Txt>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", marginTop: "16px" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            height: `${height}px`,
            width: "90px"
          }}
        >
          <Txt size={12} color={SOFT}>
            {compact(max)}
          </Txt>
          <Txt size={12} color={SOFT}>
            {compact(max * 0.66)}
          </Txt>
          <Txt size={12} color={SOFT}>
            {compact(max * 0.33)}
          </Txt>
          <Txt size={12} color={SOFT}>
            {compact(0)}
          </Txt>
        </div>

        {/* Columns rather than a path: boxes are the part of this layout
            engine that renders with certainty, and at this density the
            series still reads as a continuous area. */}
        <div style={{ display: "flex", alignItems: "flex-end", height: `${height}px`, flex: 1 }}>
          {r.balanceHistory.map((p, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flex: 1,
                height: `${Math.max(2, Math.round((p.value / max) * height))}px`,
                marginLeft: "2px",
                borderRadius: "3px 3px 0 0",
                backgroundColor: i === r.balanceHistory.length - 1 ? BRAND : "#C3D0E6"
              }}
            />
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginLeft: "90px",
          marginTop: "9px"
        }}
      >
        <Txt size={12} color={SOFT}>
          {r.balanceHistory.length > 0
            ? shortDate(new Date(r.balanceHistory[0].t).toISOString())
            : ""}
        </Txt>
        <Txt size={12} color={SOFT}>
          Today
        </Txt>
      </div>
    </div>
  );
}

function PositionTable({ rows, open }: { rows: ReportPosition[]; open?: boolean }) {
  const COLS = [
    { label: "Market", width: "152px" },
    { label: "Staked", width: "108px" },
    { label: "Entry", width: "108px" },
    { label: open ? "Now" : "Exit", width: "108px" },
    { label: "Value", width: "108px" }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          paddingBottom: "8px",
          borderBottom: `1px solid ${LINE}`
        }}
      >
        {COLS.map((c) => (
          <Txt key={c.label} size={12} color={SOFT} style={{ width: c.width }}>
            {c.label}
          </Txt>
        ))}
        <div style={{ display: "flex", flex: 1, justifyContent: "flex-end" }}>
          <Txt size={12} color={SOFT}>
            {open ? "Unrealised" : "Result"}
          </Txt>
        </div>
      </div>

      {rows.map((p, i) => {
        const up = p.pnl >= 0;
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
            <div style={{ display: "flex", flexDirection: "column", width: "152px" }}>
              <Txt size={15} weight={700}>
                {`${p.symbol.replace("USDT", "")}/USDT`}
              </Txt>
              <Txt size={11} color={SOFT} style={{ marginTop: "2px" }}>
                {`${p.side}${p.timeframe ? ` · ${p.timeframe}` : ""} · ${shortDate(p.openedAt)}`}
              </Txt>
            </div>
            <Txt size={14} style={{ width: "108px" }}>
              {money(p.staked)}
            </Txt>
            <Txt size={14} color={MUTED} style={{ width: "108px" }}>
              {price(p.entryPrice)}
            </Txt>
            <Txt size={14} color={MUTED} style={{ width: "108px" }}>
              {price(p.livePrice)}
            </Txt>
            <Txt size={14} weight={700} style={{ width: "108px" }}>
              {money(p.value)}
            </Txt>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                alignItems: "flex-end"
              }}
            >
              <Txt size={15} weight={700} color={up ? UP : DOWN}>
                {`${up ? "+" : "−"}${money(Math.abs(p.pnl))}`}
              </Txt>
              <Txt size={12} weight={700} color={up ? UP : DOWN}>
                {pct(p.pnlPct)}
              </Txt>
            </div>
          </div>
        );
      })}
    </div>
  );
}
