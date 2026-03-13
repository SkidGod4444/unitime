#!/usr/bin/env node
/**
 * Bumps or sets the Expo app version in apps/mobile/app.config.js
 * and keeps apps/mobile/package.json version in sync.
 *
 * Usage:
 *   node scripts/bump-version.mjs          # increments patch (e.g. 1.0.1 -> 1.0.2)
 *   node scripts/bump-version.mjs 1.2.3    # sets version explicitly
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve relative to this script's directory so it works when run from apps/mobile
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_DIR = path.resolve(__dirname, "..");
const APP_CONFIG = path.join(BASE_DIR, "app.config.js");
const PKG_JSON = path.join(BASE_DIR, "package.json");

const input = process.argv[2];
const semverRe = /^(\d+)\.(\d+)\.(\d+)$/;

function ensureFile(p) {
  if (!fs.existsSync(p)) {
    console.error(`File not found: ${p}`);
    process.exit(1);
  }
}

function bumpPatch(v) {
  const m = v.match(semverRe);
  if (!m) throw new Error(`Not a semver version: ${v}`);
  const [_, maj, min, pat] = m;
  return `${maj}.${min}.${Number(pat) + 1}`;
}

function setOrBump(current, arg) {
  if (arg) {
    if (!semverRe.test(arg)) {
      console.error(`Invalid version provided: ${arg}. Expected x.y.z`);
      process.exit(1);
    }
    return arg;
  }
  return bumpPatch(current);
}

ensureFile(APP_CONFIG);
ensureFile(PKG_JSON);

const cfgSrc = fs.readFileSync(APP_CONFIG, "utf8");
const cfgRe = /(version:\s*["'])(\d+\.\d+\.\d+)(["'])/;
const match = cfgSrc.match(cfgRe);
if (!match) {
  console.error("Could not locate version in app.config.js (expected version: 'x.y.z')");
  process.exit(1);
}
const current = match[2];
const next = setOrBump(current, input);

if (current === next) {
  console.log(`Version unchanged: ${current}`);
  process.exit(0);
}

const updatedCfg = cfgSrc.replace(cfgRe, `$1${next}$3`);
fs.writeFileSync(APP_CONFIG, updatedCfg, "utf8");

// Sync package.json version
const pkg = JSON.parse(fs.readFileSync(PKG_JSON, "utf8"));
const prevPkgVer = pkg.version;
pkg.version = next;
fs.writeFileSync(PKG_JSON, JSON.stringify(pkg, null, 2) + "\n", "utf8");

console.log(`App version: ${current} -> ${next}`);
if (prevPkgVer !== next) {
  console.log(`Synced package.json version: ${prevPkgVer} -> ${next}`);
}
