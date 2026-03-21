#!/usr/bin/env node
/**
 * Copies the Angular SSR server bundle into functions/angular-server/ so the
 * Cloud Function can import it at runtime.
 *
 * Run automatically by firebase.json predeploy, or manually:
 *   node scripts/copy-ssr-bundle.js
 *
 * Source:      dist/birthday-reminder-pro/server/
 * Destination: functions/angular-server/
 *
 * Key file the Cloud Function expects:
 *   functions/angular-server/server.mjs  (exports app())
 *   functions/angular-server/index.server.html
 */

const { cpSync, existsSync, rmSync } = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC  = path.join(ROOT, 'dist', 'birthday-reminder-pro', 'server');
const DEST = path.join(ROOT, 'functions', 'angular-server');

// ── 1. Verify the Angular build ran first ────────────────────────────────────
if (!existsSync(SRC)) {
  console.error(`\n❌  Source not found: ${SRC}`);
  console.error('   Run "npm run build" (ng build) before deploying.\n');
  process.exit(1);
}

const ENTRY = path.join(SRC, 'server.mjs');
if (!existsSync(ENTRY)) {
  console.error(`\n❌  SSR entry point not found: ${ENTRY}`);
  console.error('   Expected Angular application builder to emit server.mjs.');
  console.error('   Check angular.json → ssr.entry = "server.ts"\n');
  process.exit(1);
}

const INDEX = path.join(SRC, 'index.server.html');
if (!existsSync(INDEX)) {
  console.error(`\n❌  SSR HTML template not found: ${INDEX}`);
  console.error('   The Angular build appears incomplete.\n');
  process.exit(1);
}

// ── 2. Clean previous copy so stale files don't accumulate ──────────────────
if (existsSync(DEST)) {
  rmSync(DEST, { recursive: true, force: true });
}

// ── 3. Copy ──────────────────────────────────────────────────────────────────
try {
  cpSync(SRC, DEST, { recursive: true });
} catch (err) {
  console.error(`\n❌  Copy failed: ${err.message}\n`);
  process.exit(1);
}

// ── 4. Confirm expected files are present in destination ─────────────────────
const checks = ['server.mjs', 'index.server.html'];
const missing = checks.filter(f => !existsSync(path.join(DEST, f)));

if (missing.length > 0) {
  console.error(`\n❌  Copy succeeded but expected files are missing in ${DEST}:`);
  missing.forEach(f => console.error(`   • ${f}`));
  process.exit(1);
}

console.log(`✅  SSR bundle copied to functions/angular-server/`);
console.log(`   ${SRC}`);
console.log(`   → ${DEST}`);
