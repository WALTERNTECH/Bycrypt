/**
 * Generates the manifest screenshots shown in Android's install dialog.
 *
 * Run with: npm i -D sharp && node scripts/generate-screenshots.mjs
 *   (sharp is not a tracked dependency — the PNGs are committed)
 *
 * These deliberately render the app's real layout, palette and copy with
 * empty/zero values — i.e. exactly what a newly registered user sees.
 * Inventing balances or returns here would be showing prospective users
 * a product state that doesn't exist, which on a financial app is not a
 * cosmetic problem.
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "screenshots");

const C = {
  base: "#0A0D12",
  surface: "#12161C",
  surface2: "#191E26",
  surface3: "#212832",
  border: "#232A34",
  borderStrong: "#333C49",
  brand: "#F0B90B",
  brandHover: "#FFCD1F",
  positive: "#0ECB81",
  negative: "#F6465D",
  text: "#EDF0F3",
  text2: "#8B95A5",
  text3: "#5D6673",
  header: "#FFFFFF",
  headerText: "#12161C",
  headerMuted: "#6B7480",
  headerDark: "#1E2329",
  ink: "#0A0D12"
};

const W = 1080;
const H = 1920;
const F = "Inter, DejaVu Sans, Verdana, Arial, sans-serif";

/** White app chrome: profile chip, Verify CTA, Support chip. */
function header() {
  return `
  <rect width="${W}" height="150" fill="${C.header}"/>
  <rect x="34" y="34" width="300" height="82" rx="41" fill="#F4F5F7" stroke="#E1E4EA" stroke-width="2"/>
  <circle cx="79" cy="75" r="34" fill="${C.headerDark}"/>
  <text x="79" y="75" fill="#fff" font-family="${F}" font-size="30" font-weight="800" text-anchor="middle" dominant-baseline="central">W</text>
  <text x="128" y="64" fill="${C.headerText}" font-family="${F}" font-size="26" font-weight="700">Walter</text>
  <text x="128" y="96" fill="${C.headerMuted}" font-family="${F}" font-size="20">View account</text>

  <rect x="600" y="34" width="188" height="82" rx="24" fill="url(#gold)" stroke="#C9990A" stroke-width="2"/>
  <text x="694" y="75" fill="${C.ink}" font-family="${F}" font-size="26" font-weight="700" text-anchor="middle" dominant-baseline="central">Verify</text>

  <rect x="806" y="34" width="240" height="82" rx="24" fill="${C.headerDark}"/>
  <text x="926" y="75" fill="#fff" font-family="${F}" font-size="26" font-weight="700" text-anchor="middle" dominant-baseline="central">Support</text>

  <rect y="150" width="${W}" height="52" fill="#F4F5F7"/>
  <text x="34" y="176" fill="${C.headerMuted}" font-family="${F}" font-size="20" font-weight="700" dominant-baseline="central">BTC</text>
  <text x="104" y="176" fill="${C.headerText}" font-family="${F}" font-size="20" font-weight="600" dominant-baseline="central">79,050</text>
  <text x="232" y="176" fill="#0A8F5C" font-family="${F}" font-size="20" font-weight="700" dominant-baseline="central">+2.12%</text>
  <text x="360" y="176" fill="${C.headerMuted}" font-family="${F}" font-size="20" font-weight="700" dominant-baseline="central">ETH</text>
  <text x="430" y="176" fill="${C.headerText}" font-family="${F}" font-size="20" font-weight="600" dominant-baseline="central">2,483</text>
  <text x="546" y="176" fill="#0A8F5C" font-family="${F}" font-size="20" font-weight="700" dominant-baseline="central">+1.25%</text>
  <text x="674" y="176" fill="${C.headerMuted}" font-family="${F}" font-size="20" font-weight="700" dominant-baseline="central">SOL</text>
  <text x="744" y="176" fill="${C.headerText}" font-family="${F}" font-size="20" font-weight="600" dominant-baseline="central">96.32</text>
  <text x="850" y="176" fill="#0A8F5C" font-family="${F}" font-size="20" font-weight="700" dominant-baseline="central">+0.92%</text>`;
}

function bottomNav(active) {
  const items = ["Home", "Markets", "Trade", "Positions", "Deposit"];
  const w = W / items.length;
  return (
    `<rect y="${H - 132}" width="${W}" height="132" fill="${C.surface}"/>
     <rect y="${H - 132}" width="${W}" height="2" fill="${C.border}"/>` +
    items
      .map((label, i) => {
        const cx = w * i + w / 2;
        const on = i === active;
        const col = on ? C.brand : C.text3;
        return `
        ${on ? `<rect x="${w * i + 28}" y="${H - 132}" width="${w - 56}" height="5" rx="3" fill="${C.brand}"/>` : ""}
        <circle cx="${cx}" cy="${H - 82}" r="15" fill="none" stroke="${col}" stroke-width="3"/>
        <text x="${cx}" y="${H - 40}" fill="${col}" font-family="${F}" font-size="20" font-weight="700" text-anchor="middle">${label}</text>`;
      })
      .join("")
  );
}

function defs() {
  return `<defs>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.brandHover}"/><stop offset="1" stop-color="${C.brand}"/>
    </linearGradient>
    <linearGradient id="card" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.surface2}"/><stop offset="1" stop-color="${C.surface}"/>
    </linearGradient>
  </defs>`;
}

/** Screen 1 — the balance model: wallet vs trading, kept separate. */
function homeScreen() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${defs()}
  <rect width="${W}" height="${H}" fill="${C.base}"/>
  ${header()}

  <rect x="30" y="238" width="1020" height="330" rx="34" fill="url(#card)" stroke="${C.border}" stroke-width="2"/>
  <text x="66" y="292" fill="${C.text3}" font-family="${F}" font-size="20" font-weight="700" letter-spacing="2">TOTAL EQUITY</text>
  <text x="66" y="356" fill="${C.text}" font-family="${F}" font-size="64" font-weight="800">$0.00</text>
  <rect x="30" y="392" width="1020" height="2" fill="${C.border}"/>
  <rect x="540" y="392" width="2" height="176" fill="${C.border}"/>
  <text x="66" y="432" fill="${C.text3}" font-family="${F}" font-size="19" font-weight="700" letter-spacing="2">WALLET</text>
  <text x="66" y="482" fill="${C.text}" font-family="${F}" font-size="40" font-weight="800">$0.00</text>
  <text x="66" y="524" fill="${C.text3}" font-family="${F}" font-size="19">Available to trade or withdraw</text>
  <text x="576" y="432" fill="${C.text3}" font-family="${F}" font-size="19" font-weight="700" letter-spacing="2">TRADING</text>
  <text x="576" y="482" fill="${C.text3}" font-family="${F}" font-size="40" font-weight="800">$0.00</text>
  <text x="576" y="524" fill="${C.text3}" font-family="${F}" font-size="19">No open position</text>

  <rect x="30" y="596" width="330" height="128" rx="26" fill="url(#gold)" stroke="#C9990A" stroke-width="2"/>
  <text x="195" y="668" fill="${C.ink}" font-family="${F}" font-size="26" font-weight="700" text-anchor="middle">Trade</text>
  <rect x="376" y="596" width="330" height="128" rx="26" fill="${C.surface2}" stroke="${C.borderStrong}" stroke-width="2"/>
  <text x="541" y="668" fill="${C.positive}" font-family="${F}" font-size="26" font-weight="700" text-anchor="middle">Deposit</text>
  <rect x="722" y="596" width="328" height="128" rx="26" fill="${C.surface2}" stroke="${C.borderStrong}" stroke-width="2"/>
  <text x="886" y="668" fill="${C.text}" font-family="${F}" font-size="26" font-weight="700" text-anchor="middle">Withdraw</text>

  <rect x="30" y="756" width="1020" height="150" rx="30" fill="${C.surface}" stroke="${C.border}" stroke-width="2"/>
  <rect x="30" y="756" width="7" height="150" rx="4" fill="${C.brand}"/>
  <rect x="66" y="790" width="82" height="82" rx="24" fill="#2A2410" stroke="#5C4A0A" stroke-width="2"/>
  <path d="M88 848 L104 828 L116 840 L134 812" fill="none" stroke="${C.brand}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M122 812 h14 v14" fill="none" stroke="${C.brand}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="180" y="806" fill="${C.brand}" font-family="${F}" font-size="19" font-weight="700" letter-spacing="2">SIGNAL</text>
  <text x="180" y="850" fill="${C.text}" font-family="${F}" font-size="28" font-weight="700">Buy SOL</text>
  <text x="330" y="850" fill="${C.text2}" font-family="${F}" font-size="24">Solana</text>
  <text x="180" y="886" fill="${C.positive}" font-family="${F}" font-size="22" font-weight="700">+6.84%</text>
  <rect x="856" y="800" width="150" height="62" rx="18" fill="url(#gold)" stroke="#C9990A" stroke-width="2"/>
  <text x="931" y="831" fill="${C.ink}" font-family="${F}" font-size="24" font-weight="700" text-anchor="middle" dominant-baseline="central">Trade</text>

  <text x="30" y="982" fill="${C.text}" font-family="${F}" font-size="28" font-weight="700">Markets</text>
  ${[
    ["BTC", "79,050", "+2.12%", true],
    ["ETH", "2,483.11", "+1.25%", true],
    ["SOL", "96.32", "+0.92%", true],
    ["BNB", "706.26", "+1.13%", true],
    ["XRP", "1.4230", "-0.61%", false],
    ["DOGE", "0.0913", "-1.05%", false]
  ]
    .map(([sym, px, ch, up], i) => {
      const x = 30 + (i % 2) * 522;
      const y = 1016 + Math.floor(i / 2) * 176;
      return `<rect x="${x}" y="${y}" width="498" height="152" rx="26" fill="${C.surface}" stroke="${C.border}" stroke-width="2"/>
        <text x="${x + 34}" y="${y + 50}" fill="${C.text}" font-family="${F}" font-size="26" font-weight="700">${sym}</text>
        <text x="${x + 42 + String(sym).length * 20}" y="${y + 50}" fill="${C.text3}" font-family="${F}" font-size="20">/USDT</text>
        <text x="${x + 34}" y="${y + 100}" fill="${C.text}" font-family="${F}" font-size="34" font-weight="700">${px}</text>
        <text x="${x + 34}" y="${y + 136}" fill="${up ? C.positive : C.negative}" font-family="${F}" font-size="22" font-weight="700">${ch}</text>`;
    })
    .join("")}

  ${bottomNav(0)}
</svg>`;
}

/** Screen 2 — the trading surface: chart plus the order pad. */
function tradeScreen() {
  const pts = [
    [0, 300], [90, 268], [180, 286], [270, 232], [360, 250],
    [450, 196], [540, 214], [630, 160], [720, 186], [810, 132], [900, 154], [990, 104]
  ];
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0] + 60},${p[1] + 420}`).join(" ");
  const area = `${line} L1050,840 L60,840 Z`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${defs()}
  <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${C.positive}" stop-opacity="0.28"/>
    <stop offset="1" stop-color="${C.positive}" stop-opacity="0"/>
  </linearGradient>
  <rect width="${W}" height="${H}" fill="${C.base}"/>
  ${header()}

  <rect x="30" y="238" width="72" height="72" rx="20" fill="${C.surface2}" stroke="${C.borderStrong}" stroke-width="2"/>
  <text x="66" y="274" fill="${C.text2}" font-family="${F}" font-size="22" font-weight="700" text-anchor="middle" dominant-baseline="central">SOL</text>
  <text x="122" y="266" fill="${C.text}" font-family="${F}" font-size="28" font-weight="700">SOL</text>
  <text x="188" y="266" fill="${C.text3}" font-family="${F}" font-size="22">/USDT</text>
  <text x="122" y="300" fill="${C.text3}" font-family="${F}" font-size="20">Solana</text>
  <text x="30" y="378" fill="${C.text}" font-family="${F}" font-size="56" font-weight="800">$96.32</text>
  <rect x="330" y="342" width="150" height="48" rx="12" fill="#0C2A22"/>
  <text x="405" y="367" fill="${C.positive}" font-family="${F}" font-size="24" font-weight="700" text-anchor="middle" dominant-baseline="central">+0.92%</text>

  <rect x="30" y="410" width="1020" height="450" rx="30" fill="${C.surface}" stroke="${C.border}" stroke-width="2"/>
  <path d="${area}" fill="url(#fill)"/>
  <path d="${line}" fill="none" stroke="${C.positive}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>

  <rect x="30" y="890" width="1020" height="300" rx="30" fill="${C.surface}" stroke="${C.border}" stroke-width="2"/>
  <text x="66" y="944" fill="${C.text3}" font-family="${F}" font-size="19" font-weight="700" letter-spacing="2">AVAILABLE TO TRADE</text>
  <text x="1014" y="944" fill="${C.text}" font-family="${F}" font-size="30" font-weight="700" text-anchor="end">$0.00</text>
  <rect x="66" y="984" width="470" height="128" rx="26" fill="${C.positive}" stroke="#0BA469" stroke-width="2"/>
  <text x="301" y="1048" fill="${C.ink}" font-family="${F}" font-size="30" font-weight="700" text-anchor="middle">Buy SOL</text>
  <rect x="556" y="984" width="458" height="128" rx="26" fill="${C.negative}" stroke="#C9384B" stroke-width="2"/>
  <text x="785" y="1048" fill="#fff" font-family="${F}" font-size="30" font-weight="700" text-anchor="middle">Sell SOL</text>
  <text x="540" y="1152" fill="${C.text3}" font-family="${F}" font-size="21" text-anchor="middle">One position at a time · close any time</text>

  <rect x="30" y="1224" width="1020" height="220" rx="30" fill="${C.surface}" stroke="${C.border}" stroke-width="2"/>
  <text x="66" y="1280" fill="${C.text3}" font-family="${F}" font-size="19" font-weight="700" letter-spacing="2">7-DAY PLAN</text>
  <text x="66" y="1338" fill="${C.text}" font-family="${F}" font-size="34" font-weight="700">40% minimum return</text>
  <text x="66" y="1392" fill="${C.text2}" font-family="${F}" font-size="24">Uncapped upside · settles to your wallet</text>

  ${bottomNav(2)}
</svg>`;
}

await mkdir(OUT, { recursive: true });

for (const [file, svg] of [
  ["home.png", homeScreen()],
  ["trade.png", tradeScreen()]
]) {
  await sharp(Buffer.from(svg), { density: 200 }).png({ compressionLevel: 9 }).toFile(join(OUT, file));
  console.log(`  ${file.padEnd(14)} ${W}x${H}`);
}
console.log("done");
