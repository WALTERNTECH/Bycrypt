#!/usr/bin/env node
/**
 * Packages the project into a single zip.
 *
 * Built on `git archive` rather than a directory walk, which decides what
 * goes in by what is committed. That gets three things right for free:
 * node_modules and .next are not in it, .env.local and .vercel cannot
 * leak into it, and the entries use forward slashes so it extracts
 * correctly on the Linux host it is destined for.
 *
 * It follows from that that the zip holds what is committed — anything
 * still sitting unstaged in the working tree will not be in it, and the
 * script says so rather than quietly shipping a stale bundle.
 *
 *   node scripts/build-zip.mjs            -> build/krypton-<date>-<sha>.zip
 *   node scripts/build-zip.mjs --latest   -> also writes build/krypton-latest.zip
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, statSync, copyFileSync, readdirSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "build");

const git = (...args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();

function main() {
  const dirty = git("status", "--porcelain");
  if (dirty) {
    console.log("Uncommitted changes — these will NOT be in the zip:\n");
    for (const line of dirty.split("\n")) console.log("   " + line);
    console.log("\nCommit them first if they belong in the bundle.\n");
  }

  const sha = git("rev-parse", "--short", "HEAD");
  const date = new Date().toISOString().slice(0, 10);
  const subject = git("log", "-1", "--format=%s");

  mkdirSync(OUT_DIR, { recursive: true });

  // One build per commit; older bundles for the same commit are replaced
  // rather than piling up next to it.
  for (const existing of readdirSync(OUT_DIR)) {
    if (existing.endsWith(`-${sha}.zip`)) unlinkSync(join(OUT_DIR, existing));
  }

  const name = `krypton-${date}-${sha}.zip`;
  const target = join(OUT_DIR, name);

  execFileSync("git", ["archive", "--format=zip", "-9", "-o", target, "HEAD"], {
    cwd: ROOT,
    stdio: "inherit"
  });

  if (process.argv.includes("--latest")) {
    copyFileSync(target, join(OUT_DIR, "krypton-latest.zip"));
  }

  // The point of the check is the things that must NOT be in there.
  const listing = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" })
    .trim()
    .split("\n");
  // .env.example is a template of REPLACE_WITH placeholders and belongs in
  // the bundle; every other .env file does not.
  const forbidden = listing.filter(
    (f) =>
      (/(^|\/)\.env(\.|$)/.test(f) && !f.endsWith(".env.example")) ||
      /(^|\/)node_modules\//.test(f) ||
      f.includes("/.next/") ||
      f.includes("/.vercel/")
  );

  const size = statSync(target).size;
  console.log(`\n  ${name}`);
  console.log(`  ${(size / 1024 / 1024).toFixed(2)} MB · ${listing.length} files · commit ${sha}`);
  console.log(`  "${subject}"`);
  console.log(`  ${target}`);

  if (forbidden.length > 0) {
    console.log("\n  REFUSING TO VOUCH FOR THIS BUNDLE — it contains:");
    for (const f of forbidden) console.log("     " + f);
    process.exitCode = 1;
  } else {
    console.log("\n  No env files, no node_modules, no build output.");
  }
}

main();
