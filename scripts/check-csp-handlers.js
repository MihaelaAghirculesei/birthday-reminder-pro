'use strict';

/**
 * Verifies every inline event handler in the built HTML is allowed by the CSP.
 * Run after `npm run build`.
 *
 * Critical-CSS inlining emits onload="this.media='all'" on the main stylesheet.
 * If the CSP does not allow that exact handler, the stylesheet never applies and
 * the app renders with critical CSS only — with no error beyond a console line.
 *
 * Only src/_headers is checked: these static files are what Cloudflare Pages serves.
 * The SSR server renders with a nonce, so Angular emits no inline handler there.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BROWSER_DIR = path.join(ROOT, 'dist', 'birthday-reminder-pro', 'browser');
const POLICY = fs.readFileSync(path.join(ROOT, 'src', '_headers'), 'utf8');

if (!fs.existsSync(BROWSER_DIR)) {
  console.error('ERROR: dist/birthday-reminder-pro/browser not found — run "npm run build" first');
  process.exit(1);
}

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(full);
    return entry.name.endsWith('.html') ? [full] : [];
  });
}

const handlers = new Map();
for (const file of htmlFiles(BROWSER_DIR)) {
  const html = fs.readFileSync(file, 'utf8');
  for (const match of html.matchAll(/\son[a-z]+="([^"]*)"/g)) {
    const hash = `sha256-${crypto.createHash('sha256').update(match[1]).digest('base64')}`;
    handlers.set(hash, match[1]);
  }
}

let failed = false;
for (const [hash, code] of handlers) {
  if (!POLICY.includes(hash) || !POLICY.includes("'unsafe-hashes'")) {
    console.error(`ERROR: inline handler "${code}" (${hash}) is not allowed by src/_headers`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log(`OK: ${handlers.size} inline handler(s) allowed by the CSP`);
