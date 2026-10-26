'use strict';

/**
 * Verifies every inline script and inline event handler in the built HTML is
 * allowed by the CSP. Run after `npm run build`.
 *
 * Critical-CSS inlining loads the main stylesheet as media="print" and switches
 * it to "all" from inline code: an onload="this.media='all'" handler up to
 * Angular 21, an inline <script> on data-beasties-media links since Angular 22.
 * If the CSP does not allow that exact code, the stylesheet never applies and
 * the app renders with critical CSS only — with no error beyond a console line.
 *
 * Only src/_headers is checked: these static files are what Cloudflare Pages serves.
 * The SSR server stamps a nonce on every <script>, so no hash is needed there.
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

function directive(name) {
  const match = POLICY.match(new RegExp(`(?:^|[;\\s])${name}\\s([^;\\n]*)`));
  return match ? match[1] : '';
}

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(full);
    return entry.name.endsWith('.html') ? [full] : [];
  });
}

const sha256 = (code) => `sha256-${crypto.createHash('sha256').update(code).digest('base64')}`;

const handlers = new Map();
const scripts = new Map();
for (const file of htmlFiles(BROWSER_DIR)) {
  const html = fs.readFileSync(file, 'utf8');
  for (const match of html.matchAll(/\son[a-z]+="([^"]*)"/g)) {
    handlers.set(sha256(match[1]), match[1]);
  }
  // Inline classic/module scripts only: src= scripts are covered by 'self', and
  // data blocks (JSON, ld+json) are not executed, so the CSP does not apply.
  for (const match of html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)) {
    const type = (match[1].match(/\btype="([^"]*)"/) || [])[1];
    if (type && type !== 'module' && type !== 'text/javascript') continue;
    if (match[2].trim()) scripts.set(sha256(match[2]), match[2]);
  }
}

const scriptSrc = directive('script-src');
const scriptSrcAttr = directive('script-src-attr');

let failed = false;
for (const [hash, code] of handlers) {
  if (!scriptSrcAttr.includes(`'${hash}'`) || !scriptSrcAttr.includes("'unsafe-hashes'")) {
    console.error(`ERROR: inline handler "${code}" (${hash}) is not allowed by script-src-attr in src/_headers`);
    failed = true;
  }
}
for (const [hash, code] of scripts) {
  if (!scriptSrc.includes(`'${hash}'`)) {
    console.error(`ERROR: inline script "${code.slice(0, 80)}…" (${hash}) is not allowed by script-src in src/_headers`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log(`OK: ${scripts.size} inline script(s) and ${handlers.size} inline handler(s) allowed by the CSP`);
