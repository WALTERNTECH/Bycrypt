#!/usr/bin/env node
/**
 * Packages both apps for cPanel (Spaceship) as Passenger Node.js apps.
 *
 * Next needs a long-running Node process, so this is not a folder of HTML
 * to drop in public_html. Each app is built with Next's standalone output,
 * which emits a server and only the node_modules it actually reaches —
 * about 24MB instead of the ~400MB a full install would be, and no "NPM
 * Install" step on the server, which is where shared hosting usually runs
 * out of memory.
 *
 * The zip is written here rather than shelled out to, for one reason that
 * has bitten this project before: a zip built by Windows tooling can carry
 * backslashes in its entry names, and those extract on a Linux host as
 * single files with backslashes in the filename rather than as
 * directories. Every path written below is forced to forward slashes.
 *
 *   node scripts/build-cpanel.mjs            both apps
 *   node scripts/build-cpanel.mjs web        just one
 */

import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { deflateRawSync, crc32 as zlibCrc32 } from "node:zlib";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "build", "cpanel");

const APPS = [
  { name: "web", dir: "apps/web", label: "Krypton customer app" },
  { name: "admin", dir: "apps/admin", label: "Krypton admin console" }
];

/* ------------------------------------------------------------------ */
/* A small ZIP writer                                                  */
/* ------------------------------------------------------------------ */

const crcTable = (() => {
  const t = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  // Node gained zlib.crc32 in 20.15; the table above covers older runtimes.
  if (typeof zlibCrc32 === "function") return zlibCrc32(buf) >>> 0;
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function dosTime(date) {
  const time = ((date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() / 2)) & 0xffff;
  const day =
    (((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()) & 0xffff;
  return { time, day };
}

function writeZip(files, target) {
  const chunks = [];
  const central = [];
  let offset = 0;
  const { time, day } = dosTime(new Date());

  for (const file of files) {
    // Forward slashes, always. A backslash here lands on the host as a
    // filename containing a backslash, not as a directory.
    const name = Buffer.from(file.name.split("\\").join("/"), "utf8");
    const raw = file.data;
    const deflated = deflateRawSync(raw, { level: 9 });
    const useStore = deflated.length >= raw.length;
    const body = useStore ? raw : deflated;
    const method = useStore ? 0 : 8;
    const sum = crc32(raw);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x800, 6); // UTF-8 names
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(sum, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);

    chunks.push(local, name, body);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0x800, 8);
    cd.writeUInt16LE(method, 10);
    cd.writeUInt16LE(time, 12);
    cd.writeUInt16LE(day, 14);
    cd.writeUInt32LE(sum, 16);
    cd.writeUInt32LE(body.length, 20);
    cd.writeUInt32LE(raw.length, 24);
    cd.writeUInt16LE(name.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    // rw-r--r--, or rwxr-xr-x for the entry file so Passenger can run it.
    cd.writeUInt32LE((file.mode ?? 0o644) << 16, 38);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, name);

    offset += local.length + name.length + body.length;
  }

  const cdBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  writeFileSync(target, Buffer.concat([...chunks, cdBuf, eocd]));
}

function collect(dir, base = dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collect(full, base, acc);
    else if (entry.isFile()) {
      acc.push({
        name: relative(base, full).split("\\").join("/"),
        data: readFileSync(full),
        mode: entry.name === "app.js" ? 0o755 : 0o644
      });
    }
  }
  return acc;
}

/* ------------------------------------------------------------------ */

const PASSENGER_ENTRY = `/**
 * Passenger entry point.
 *
 * cPanel's Node.js app manager starts this file and expects the process
 * to listen on the port it provides. Next's standalone server already
 * does exactly that, so this only has to make sure the values it reads
 * are set before it is required.
 *
 * HOSTNAME is forced to 0.0.0.0: the standalone server defaults to
 * localhost, and Passenger cannot reach a process bound to that.
 */
process.env.NODE_ENV = "production";
process.env.HOSTNAME = "0.0.0.0";
process.env.PORT = process.env.PORT || "3000";

require("./server.js");
`;

function readme(app) {
  return `${app.label} — cPanel (Passenger) bundle
${"=".repeat(60)}

WHAT THIS IS
  A self-contained Node.js application. It is NOT a static site: do not
  unzip it into public_html and expect pages. It needs a Node process.

  node_modules is already inside. Do NOT run "NPM Install" in cPanel —
  it is unnecessary and will likely run out of memory on shared hosting.

SETUP (cPanel -> Setup Node.js App -> Create Application)
  Node.js version      18.17 or newer (20 or 22 recommended)
  Application mode     Production
  Application root     ${app.name === "web" ? "krypton" : "krypton-admin"}
  Application URL      your domain (or subdomain) — leave the path blank
  Startup file         app.js

  Upload this zip into the Application root and Extract there.

ENVIRONMENT VARIABLES (same screen, "Environment variables")
  NEXT_PUBLIC_SUPABASE_URL        https://<project-ref>.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY   <anon key>
  SUPABASE_SERVICE_ROLE_KEY       <service role key>
${app.name === "web" ? "  ADMIN_APP_URL                   https://<your admin domain>\n  NEXT_PUBLIC_SITE_URL            https://<this app's domain>\n" : ""}  RESEND_API_KEY                  <optional; alert and reset emails>

  Set these HERE, not in a file. SUPABASE_SERVICE_ROLE_KEY bypasses every
  row-level security policy in the database — it must never sit in a file
  inside a web-served directory.

AFTER STARTING
  Open  https://<your domain>/api/health/market
  It should return ok:true and name the exchanges the server can reach.
  If it returns 503, the host is blocking outbound HTTPS and positions
  cannot be priced — that is the first thing to fix, not a UI problem.

${app.name === "web" ? `ALSO SET IN SUPABASE
  Authentication -> URL Configuration -> Redirect URLs
  Add:  https://<your domain>/reset-password
  Without it, password reset links land on the wrong page.

` : ""}Built from commit ${execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim()} on ${new Date().toISOString().slice(0, 10)}.
`;
}

function buildApp(app) {
  const appDir = join(ROOT, app.dir);
  console.log(`\n── ${app.label} ──`);

  console.log("  building (standalone)…");
  execFileSync("npx", ["next", "build"], {
    cwd: appDir,
    env: { ...process.env, BUILD_STANDALONE: "1" },
    stdio: "pipe",
    shell: process.platform === "win32"
  });

  const standalone = join(appDir, ".next", "standalone");
  if (!existsSync(join(standalone, "server.js"))) {
    throw new Error(`${app.name}: standalone server.js missing — did the build run?`);
  }

  const stage = join(ROOT, "build", ".cpanel-stage", app.name);
  rmSync(stage, { recursive: true, force: true });
  mkdirSync(stage, { recursive: true });

  // The server, and the dependencies it actually reaches.
  cpSync(standalone, stage, { recursive: true });

  // Standalone deliberately leaves these out: they are served as files
  // rather than required, so Next expects them to be placed alongside.
  const staticDir = join(appDir, ".next", "static");
  if (existsSync(staticDir)) cpSync(staticDir, join(stage, ".next", "static"), { recursive: true });

  const publicDir = join(appDir, "public");
  if (existsSync(publicDir)) cpSync(publicDir, join(stage, "public"), { recursive: true });

  writeFileSync(join(stage, "app.js"), PASSENGER_ENTRY, "utf8");
  writeFileSync(join(stage, "README-CPANEL.txt"), readme(app), "utf8");

  const files = collect(stage);
  mkdirSync(OUT_DIR, { recursive: true });
  const target = join(OUT_DIR, `krypton-${app.name}-cpanel.zip`);
  writeZip(files, target);

  const mb = (statSync(target).size / 1024 / 1024).toFixed(1);
  console.log(`  ${files.length} files → ${mb} MB`);
  console.log(`  ${target}`);
  return target;
}

const only = process.argv[2];
const chosen = only ? APPS.filter((a) => a.name === only) : APPS;
if (chosen.length === 0) {
  console.error(`Unknown app "${only}". Use: web, admin, or omit for both.`);
  process.exit(1);
}

for (const app of chosen) buildApp(app);
rmSync(join(ROOT, "build", ".cpanel-stage"), { recursive: true, force: true });
console.log("\nDone. Upload each zip into its own cPanel Application root and Extract.\n");
