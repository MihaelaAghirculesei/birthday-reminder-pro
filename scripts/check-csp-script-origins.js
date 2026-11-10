'use strict';

/**
 * Verifies that every third-party script the app loads at runtime is allowed by
 * src/_headers, the static CSP that Cloudflare Pages serves.
 *
 * Unlike the SSR server, which uses 'strict-dynamic', the static policy is an
 * explicit allowlist, so a script injected at runtime is blocked unless its
 * origin is listed. A blocked script fails silently until the feature is used:
 * Firebase Auth reports a blocked apis.google.com loader as auth/internal-error.
 *
 * Each URL must pass two directives:
 *  - script-src, for the page that executes it;
 *  - connect-src, because the Angular service worker re-fetches page requests with
 *    fetch(), and ngsw-worker.js is served with this same policy.
 *
 * Checked URLs come from two places:
 *  - every `script.src = 'https://…'` assignment in src/ (scripts the app injects);
 *  - SDK_SCRIPTS below (scripts that SDKs inject on our behalf).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');
const POLICY = (fs.readFileSync(path.join(SRC_DIR, '_headers'), 'utf8')
  .match(/^\s*Content-Security-Policy:\s*(.+)$/m) || [])[1] || '';

const SDK_SCRIPTS = [
  // Firebase Auth signInWithPopup loads gapi, which then loads its iframe module.
  'https://apis.google.com/js/api.js',
  'https://apis.google.com/_/scs/abc-static/_/js/k=gapi.lb.en/m=gapi_iframes',
  // Firebase App Check ReCaptchaEnterpriseProvider, which then loads a versioned release.
  'https://www.google.com/recaptcha/enterprise.js',
  'https://www.gstatic.com/recaptcha/releases/version/recaptcha__en.js',
];

function directive(name) {
  const match = POLICY.match(new RegExp(`(?:^|[;\\s])${name}\\s([^;\\n]*)`));
  return match ? match[1].trim().split(/\s+/) : [];
}

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts') ? [full] : [];
  });
}

/** CSP source-expression matching for scheme://host[/path] sources (CSP3 §6.7.2.12, simplified). */
function allows(source, url) {
  const match = source.match(/^(https?):\/\/(\*\.)?([^/:]+)(\/.*)?$/);
  if (!match) return false;
  const [, scheme, wildcard, host, sourcePath] = match;
  if (url.protocol !== `${scheme}:`) return false;
  const hostMatches = wildcard ? url.hostname.endsWith(`.${host}`) : url.hostname === host;
  if (!hostMatches) return false;
  if (!sourcePath) return true;
  return sourcePath.endsWith('/') ? url.pathname.startsWith(sourcePath) : url.pathname === sourcePath;
}

const injected = new Map();
for (const file of sourceFiles(SRC_DIR)) {
  const code = fs.readFileSync(file, 'utf8');
  for (const match of code.matchAll(/\.src\s*=\s*['"`](https:\/\/[^'"`]+)['"`]/g)) {
    injected.set(match[1], path.relative(ROOT, file).split(path.sep).join('/'));
  }
}
for (const url of SDK_SCRIPTS) {
  if (!injected.has(url)) injected.set(url, 'SDK');
}

const directives = {
  'script-src': directive('script-src-elem').length ? directive('script-src-elem') : directive('script-src'),
  'connect-src': directive('connect-src'),
};

let failed = false;
for (const [url, origin] of injected) {
  for (const [name, sources] of Object.entries(directives)) {
    if (!sources.some((source) => allows(source, new URL(url)))) {
      console.error(`ERROR: ${url} (${origin}) is not allowed by ${name} in src/_headers`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log(`OK: ${injected.size} external script(s) allowed by the CSP`);
