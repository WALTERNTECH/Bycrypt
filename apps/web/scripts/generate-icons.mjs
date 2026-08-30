/**
 * Generates the PWA icon set from a single vector source.
 *
 * Run with: npm i -D sharp && node scripts/generate-icons.mjs
 *   (sharp is intentionally NOT a tracked dependency — the PNGs it
 *    emits are committed, so nothing at build or request time needs it)
 *
 *
 * Two variants are produced because they are used differently:
 *   any      — the icon as drawn, shown in browser UI and task switchers
 *   maskable — Android crops icons to a platform shape (circle, squircle,
 *              teardrop), so this one keeps the mark inside the safe zone
 *              (the inner 80%) and bleeds the background to the edges.
 */
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");

const GOLD = "#F0B90B";
const GOLD_LIGHT = "#FFCD1F";
const INK = "#0A0D12";

/** @param {number} pad fraction of the canvas to keep clear around the mark */
function svg(pad) {
  const S = 512;
  const inner = S * (1 - pad * 2);
  const off = S * pad;
  // Rounded-square plate on the "any" icon; full bleed on maskable.
  const plate =
    pad > 0
      ? `<rect x="${off}" y="${off}" width="${inner}" height="${inner}" rx="${inner * 0.22}" fill="url(#g)"/>`
      : `<rect width="${S}" height="${S}" fill="url(#g)"/>`;

  // Glyph box sits inside the plate, scaled to the safe zone.
  const gx = off + inner * 0.5;
  const gy = off + inner * 0.5;
  const fs = inner * 0.62;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${GOLD_LIGHT}"/>
      <stop offset="1" stop-color="${GOLD}"/>
    </linearGradient>
  </defs>
  ${plate}
  <text x="${gx}" y="${gy}" fill="${INK}"
        font-family="DejaVu Sans, Verdana, Arial, Helvetica, sans-serif"
        font-size="${fs}" font-weight="bold"
        text-anchor="middle" dominant-baseline="central">K</text>
</svg>`;
}

const targets = [
  { file: "icon-192.png", size: 192, pad: 0.06 },
  { file: "icon-512.png", size: 512, pad: 0.06 },
  { file: "icon-maskable-192.png", size: 192, pad: 0 },
  { file: "icon-maskable-512.png", size: 512, pad: 0 },
  // iOS home-screen icon: no transparency, no rounding (iOS applies its own).
  { file: "apple-touch-icon.png", size: 180, pad: 0 },
  { file: "favicon-32.png", size: 32, pad: 0.06 }
];

await mkdir(OUT, { recursive: true });

for (const t of targets) {
  const buf = Buffer.from(svg(t.pad));
  await sharp(buf, { density: 384 })
    .resize(t.size, t.size)
    .png({ compressionLevel: 9 })
    .toFile(join(OUT, t.file));
  console.log(`  ${t.file.padEnd(26)} ${t.size}x${t.size}`);
}

// Multi-resolution .ico for legacy favicon requests.
const ico = await sharp(Buffer.from(svg(0.06)), { density: 384 }).resize(48, 48).png().toBuffer();
await writeFile(join(OUT, "favicon.png"), ico);
console.log("  favicon.png                48x48");
console.log("done");
