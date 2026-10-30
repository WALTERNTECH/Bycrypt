// LOCAL VISUAL CHECK ONLY — deleted before commit.
import { ImageResponse } from "next/og";
import { Report, reportHeight } from "@/components/ReportDocument";
import type { ReportData } from "@/lib/report";
import { loadReportFonts } from "@/lib/fonts/reportFonts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const day = 86_400_000;
const now = Date.now();

const SAMPLE: ReportData = {
  accountName: "Walter Wekesa",
  accountEmail: "wekesawalter760@gmail.com",
  generatedAt: new Date(now).toISOString(),
  simulated: true,

  wallet: 3184.52,
  inPositions: 2412.9,
  totalAssets: 5597.42,

  totalDeposited: 4500,
  totalWithdrawn: 250,
  netProfit: 1347.42,
  netProfitPct: 29.94,

  realised: 884.1,
  unrealised: 462.9,

  openPositions: [
    {
      symbol: "BTCUSDT",
      side: "SELL",
      timeframe: "1d",
      staked: 1950,
      entryPrice: 78412.55,
      livePrice: 77180.2,
      pnl: 462.9,
      pnlPct: 23.74,
      value: 2412.9,
      open: true,
      openedAt: new Date(now - 0.6 * day).toISOString(),
      closedAt: null
    }
  ],
  closedPositions: [
    {
      symbol: "ETHUSDT", side: "BUY", timeframe: "4h", staked: 800,
      entryPrice: 2210.4, livePrice: 2268.15, pnl: 313.6, pnlPct: 39.2,
      value: 1113.6, open: false,
      openedAt: new Date(now - 3 * day).toISOString(), closedAt: new Date(now - 2.8 * day).toISOString()
    },
    {
      symbol: "SOLUSDT", side: "BUY", timeframe: "1w", staked: 1200,
      entryPrice: 102.8, livePrice: 97.44, pnl: -250.3, pnlPct: -20.86,
      value: 949.7, open: false,
      openedAt: new Date(now - 9 * day).toISOString(), closedAt: new Date(now - 5 * day).toISOString()
    },
    {
      symbol: "BTCUSDT", side: "SELL", timeframe: "1d", staked: 1500,
      entryPrice: 81204.1, livePrice: 79890.55, pnl: 820.8, pnlPct: 54.72,
      value: 2320.8, open: false,
      openedAt: new Date(now - 14 * day).toISOString(), closedAt: new Date(now - 12 * day).toISOString()
    }
  ],
  transactions: [
    { kind: "deposit", amount: 2500, at: new Date(now - 22 * day).toISOString(), status: "confirmed", asset: "0.03190411 BTC" },
    { kind: "deposit", amount: 1200, at: new Date(now - 15 * day).toISOString(), status: "confirmed", asset: "0.01477902 BTC" },
    { kind: "withdrawal", amount: 250, at: new Date(now - 6 * day).toISOString(), status: "completed", asset: null },
    { kind: "deposit", amount: 800, at: new Date(now - 4 * day).toISOString(), status: "confirmed", asset: "0.01022740 BTC" }
  ],
  balanceHistory: Array.from({ length: 30 }, (_, i) => {
    const base = [0, 0, 2500, 2500, 2500, 2480, 2510, 2495, 2530, 3330, 3310, 3345, 4545, 4530,
      4560, 4280, 4310, 4295, 4330, 4620, 4600, 4655, 4640, 5100, 5080, 5140, 5390, 5420, 5510, 5597.42];
    return { t: now - (29 - i) * day, value: base[i] ?? 0 };
  }),
  firstActivityAt: new Date(now - 22 * day).toISOString()
};

export async function GET() {
  return new ImageResponse(<Report r={SAMPLE} />, {
    width: 1200,
    height: reportHeight(SAMPLE),
    fonts: loadReportFonts()
  });
}
