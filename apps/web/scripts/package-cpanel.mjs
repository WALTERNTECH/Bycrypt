/**
 * Assembles a cPanel/Passenger-ready bundle from a standalone build.
 *
 * Run with:
 *   BUILD_STANDALONE=1 NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... npm run build
 *   node scripts/package-cpanel.mjs
 *
 * Produces dist-cpanel/, which is what gets uploaded. Everything the app
 * needs is inside it — including node_modules — so cPanel never has to
 * run an install step.
 *
 * NOTE: NEXT_PUBLIC_* values are inlined into the client bundle at build
 * time, so they must be correct when `npm run build` runs, not when this
 * script runs. Runtime-only secrets (the Supabase service-role key, mail
 * credentials) are set in cPanel's environment variable panel instead
 * and must never be baked in here.
 */
import { cp, mkdir, writeFile, rm, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STANDALONE = join(ROOT, ".next", "standalone");
const OUT = join(ROOT, "dist-cpanel");

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(STANDALONE))) {
  console.error("No .next/standalone found. Build with BUILD_STANDALONE=1 first.");
  process.exit(1);
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

// 1. The standalone tree: server.js, node_modules, traced app files.
await cp(STANDALONE, OUT, { recursive: true });

// 2. Next deliberately leaves these two out of standalone; without them
//    every stylesheet, client chunk and icon 404s.
await cp(join(ROOT, ".next", "static"), join(OUT, ".next", "static"), { recursive: true });
if (await exists(join(ROOT, "public"))) {
  await cp(join(ROOT, "public"), join(OUT, "public"), { recursive: true });
}

// 3. Passenger entry point.
//
//    Two things are wrong by default on CloudLinux/cPanel:
//
//    HOSTNAME is set by the platform to the physical server's hostname
//    (e.g. "premium42.web-hosting.com"). Next's standalone server does
//    `process.env.HOSTNAME || '0.0.0.0'` and then binds to it, which
//    fails with EADDRNOTAVAIL because that name doesn't resolve to a
//    local interface. Clearing it restores the 0.0.0.0 default.
//
//    NODE_ENV may be unset, and Next needs production to serve the
//    prebuilt output rather than looking for a dev server.
await writeFile(
  join(OUT, "app.js"),
  `// Passenger startup file — see scripts/package-cpanel.mjs for why.
delete process.env.HOSTNAME;
process.env.NODE_ENV = process.env.NODE_ENV || "production";
require("./server.js");
`
);

// 4. A dependency-free manifest. node_modules is already bundled, so if
//    the panel runs "npm install" it should do nothing rather than try
//    to resolve the full dependency tree on a shared host.
await writeFile(
  join(OUT, "package.json"),
  JSON.stringify(
    {
      name: "krypton-web",
      version: "1.0.0",
      private: true,
      scripts: { start: "node app.js" },
      dependencies: {}
    },
    null,
    2
  ) + "\n"
);

console.log("dist-cpanel/ ready");
console.log("  entry file : app.js");
console.log("  upload     : the CONTENTS of dist-cpanel/ into your app root");
