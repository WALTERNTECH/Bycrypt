import { mapPositionRow, positionState, POSITION_COLUMNS, type OpenPositionRow } from "./position";
import { fetchTickers } from "./market";

/**
 * Everything a Krypton report states, assembled in one place.
 *
 * Used by the statement screen and by the downloadable image, so the
 * picture someone saves and the page they saved it from cannot disagree.
 *
 * Two things here are reconstructions rather than records, and both are
 * labelled as such wherever they appear:
 *
 *   Balance history. No balance snapshots are stored, so the series is
 *   rebuilt from the events that moved it — confirmed deposits, paid
 *   withdrawals, and the profit or loss realised when a position closed.
 *   That makes it exact at every point a real event happened, which is
 *   what a statement needs, rather than smooth.
 *
 *   Net profit. The headline figure is what the account is worth now,
 *   less what was put into it, plus anything already taken out. Leaving
 *   withdrawals out of that — current balance minus deposits alone —
 *   would report a loss for anyone who had successfully taken money out,
 *   which is the opposite of what happened to them.
 */

export interface ReportPosition {
  symbol: string;
  side: string;
  timeframe: string | null;
  invested: number;
  entryPrice: number | null;
  livePrice: number | null;
  pnl: number;
  pnlPct: number;
  value: number;
  open: boolean;
  openedAt: string;
  closedAt: string | null;
}

export interface ReportTransaction {
  kind: "deposit" | "withdrawal";
  amount: number;
  at: string;
  status: string;
  asset: string | null;
}

export interface ReportData {
  accountName: string;
  accountEmail: string;
  generatedAt: string;
  simulated: boolean;

  wallet: number;
  inPositions: number;
  totalAssets: number;

  totalDeposited: number;
  totalWithdrawn: number;
  netProfit: number;
  netProfitPct: number;

  realised: number;
  unrealised: number;

  openPositions: ReportPosition[];
  closedPositions: ReportPosition[];
  transactions: ReportTransaction[];
  balanceHistory: { t: number; value: number }[];
  firstActivityAt: string | null;
}

const num = (v: unknown): number => {
  if (v === null || v === undefined || v === "") return 0;
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
};

export async function buildReport(supabase: any, userId: string, email: string): Promise<ReportData> {
  const [{ data: profile }, { data: deposits }, { data: withdrawals }, { data: investments }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, wallet_balance, is_simulated")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("deposits")
        .select("amount, asset_amount, status, confirmed_at, submitted_at")
        .eq("user_id", userId)
        .order("submitted_at", { ascending: true }),
      supabase
        .from("withdrawals")
        .select("amount, status, requested_at, processed_at")
        .eq("user_id", userId)
        .order("requested_at", { ascending: true }),
      supabase
        .from("investments")
        .select(POSITION_COLUMNS + ", closed_at, exit_price, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
    ]);

  const simulated = profile?.is_simulated === true;
  const wallet = num(profile?.wallet_balance);

  const allInvestments = investments ?? [];
  const openRows: OpenPositionRow[] = allInvestments
    .filter((i: any) => i.status !== "withdrawn")
    .map(mapPositionRow);

  // Price every open position from the same feed settlement uses.
  const symbols = Array.from(new Set(openRows.map((r) => r.symbol).filter(Boolean))) as string[];
  let tickers: Record<string, { lastPrice: number; priceChangePercent: number }> = {};
  if (symbols.length > 0) {
    try {
      tickers = await fetchTickers(symbols);
    } catch {
      /* unpriced positions fall back to the amount invested below */
    }
  }

  const openPositions: ReportPosition[] = openRows.map((row) => {
    const t = row.symbol ? tickers[row.symbol] : undefined;
    const state = positionState({
      principal: row.principal,
      accrued: row.accrued,
      side: row.side,
      entryPrice: row.entryPrice,
      livePrice: t?.lastPrice ?? null,
      fallbackPct: t?.priceChangePercent ?? null,
      targetGainPct: row.targetGainPct,
      startedAt: row.startedAt,
      timeframe: row.timeframe,
      simulated
    });
    return {
      symbol: row.symbol ?? "—",
      side: row.side,
      timeframe: row.timeframe,
      invested: row.principal,
      entryPrice: row.entryPrice,
      livePrice: t?.lastPrice ?? null,
      pnl: state.pnl,
      pnlPct: state.pnlPct,
      value: state.settles,
      open: true,
      openedAt: row.startedAt,
      closedAt: null
    };
  });

  const closedPositions: ReportPosition[] = allInvestments
    .filter((i: any) => i.status === "withdrawn")
    .map((i: any) => {
      const invested = num(i.amount);
      const pnl = num(i.accrued_return);
      return {
        symbol: (i.traded_symbol as string) ?? "—",
        side: String(i.side ?? "BUY"),
        timeframe: (i.timeframe as string) ?? null,
        invested,
        entryPrice: i.entry_price === null ? null : num(i.entry_price),
        livePrice: i.exit_price === null ? null : num(i.exit_price),
        pnl,
        pnlPct: invested > 0 ? (pnl / invested) * 100 : 0,
        value: invested + pnl,
        open: false,
        openedAt: String(i.start_date ?? i.created_at),
        closedAt: i.closed_at ? String(i.closed_at) : null
      };
    })
    .reverse();

  const confirmedDeposits = (deposits ?? []).filter((d: any) => d.status === "confirmed");
  const paidWithdrawals = (withdrawals ?? []).filter((w: any) =>
    ["completed", "approved", "paid", "processed"].includes(String(w.status))
  );

  const totalDeposited = confirmedDeposits.reduce((t: number, d: any) => t + num(d.amount), 0);
  const totalWithdrawn = paidWithdrawals.reduce((t: number, w: any) => t + num(w.amount), 0);

  const inPositions = openPositions.reduce((t, p) => t + p.value, 0);
  const totalAssets = wallet + inPositions;

  const realised = closedPositions.reduce((t, p) => t + p.pnl, 0);
  const unrealised = openPositions.reduce((t, p) => t + p.pnl, 0);

  // What it is worth now, less what went in, plus what has already come
  // out. Withdrawals have to be added back or anyone who successfully
  // took money out reads as having lost it.
  const netProfit = totalAssets + totalWithdrawn - totalDeposited;
  const netProfitPct = totalDeposited > 0 ? (netProfit / totalDeposited) * 100 : 0;

  const transactions: ReportTransaction[] = [
    ...confirmedDeposits.map((d: any) => ({
      kind: "deposit" as const,
      amount: num(d.amount),
      at: String(d.confirmed_at ?? d.submitted_at),
      status: String(d.status),
      asset: d.asset_amount ? `${num(d.asset_amount).toFixed(8)} BTC` : null
    })),
    ...(withdrawals ?? []).map((w: any) => ({
      kind: "withdrawal" as const,
      amount: num(w.amount),
      at: String(w.processed_at ?? w.requested_at),
      status: String(w.status),
      asset: null
    }))
  ]
    .filter((t) => !!t.at && t.at !== "null")
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  /* ---- balance history, rebuilt from the events that moved it ---- */

  type Event = { at: number; delta: number };
  const events: Event[] = [
    ...confirmedDeposits.map((d: any) => ({
      at: Date.parse(String(d.confirmed_at ?? d.submitted_at)),
      delta: num(d.amount)
    })),
    ...paidWithdrawals.map((w: any) => ({
      at: Date.parse(String(w.processed_at ?? w.requested_at)),
      delta: -num(w.amount)
    })),
    ...closedPositions.map((p) => ({
      at: Date.parse(String(p.closedAt ?? p.openedAt)),
      delta: p.pnl
    }))
  ]
    .filter((e) => Number.isFinite(e.at))
    .sort((a, b) => a.at - b.at);

  const firstActivityAt = events.length > 0 ? new Date(events[0].at).toISOString() : null;

  const now = Date.now();
  const spanStart = events.length > 0 ? events[0].at : now - 29 * 86_400_000;
  const start = Math.min(spanStart, now - 29 * 86_400_000);
  const POINTS = 30;
  const step = Math.max(1, (now - start) / (POINTS - 1));

  const balanceHistory: { t: number; value: number }[] = [];
  for (let i = 0; i < POINTS; i++) {
    const t = start + step * i;
    const settled = events.filter((e) => e.at <= t).reduce((sum, e) => sum + e.delta, 0);
    balanceHistory.push({ t, value: Math.max(0, settled) });
  }
  // The last point is now, which includes what open positions are
  // currently worth on top of everything already settled.
  if (balanceHistory.length > 0) {
    balanceHistory[balanceHistory.length - 1] = { t: now, value: Math.max(0, totalAssets) };
  }

  return {
    accountName: (profile?.full_name as string) ?? "Krypton account",
    accountEmail: email,
    generatedAt: new Date().toISOString(),
    simulated,
    wallet,
    inPositions,
    totalAssets,
    totalDeposited,
    totalWithdrawn,
    netProfit,
    netProfitPct,
    realised,
    unrealised,
    openPositions,
    closedPositions,
    transactions,
    balanceHistory,
    firstActivityAt
  };
}
