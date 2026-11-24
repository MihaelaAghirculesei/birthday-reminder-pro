'use strict';

/**
 * Verifies the initial JavaScript the browser downloads before first render
 * stays under MAX_BYTES. Run after `npm run build` or `npm run build:prod`.
 *
 * "Initial" means main-*.js plus every chunk it imports statically, followed
 * transitively. Lazy chunks (dynamic `import()`) are not counted. Measuring
 * main-*.js alone is not enough: how the builder splits the initial code
 * between main and shared chunks changes between Angular releases (22.3 moved
 * the shared vendor chunks back into main), while the total stays the same.
 */

const fs = require('fs');
const path = require('path');

const BROWSER_DIR = path.join(__dirname, '..', 'dist', 'birthday-reminder-pro', 'browser');
// Initial JS is ~1.1 MB; the limit only catches regressions on top of that.
// The angular.json "initial" budget (JS + CSS) stays the hard ceiling.
const MAX_BYTES = 1_250 * 1024;

// esbuild emits static imports as `from"./chunk-X.js"` or `import"./chunk-X.js"`;
// dynamic imports use `import(...)` and do not match.
const STATIC_IMPORT = /(?:\bfrom|\bimport)\s*["'](\.\/[\w.-]+\.js)["']/g;

if (!fs.existsSync(BROWSER_DIR)) {
  console.error('ERROR: dist/birthday-reminder-pro/browser not found — run "npm run build" first');
  process.exit(1);
}

const mainFile = fs
  .readdirSync(BROWSER_DIR)
  .find(f => f.startsWith('main-') && f.endsWith('.js'));

if (!mainFile) {
  console.error('ERROR: main-*.js not found in browser output');
  process.exit(1);
}

const initial = new Map();
const queue = [mainFile];
while (queue.length > 0) {
  const file = queue.pop();
  if (initial.has(file)) continue;
  const source = fs.readFileSync(path.join(BROWSER_DIR, file), 'utf8');
  initial.set(file, Buffer.byteLength(source));
  for (const [, spec] of source.matchAll(STATIC_IMPORT)) {
    queue.push(path.posix.basename(spec));
  }
}

const kb = bytes => Math.round(bytes / 1024);
const files = [...initial].sort((a, b) => b[1] - a[1]);
for (const [file, size] of files) {
  console.log(`  ${String(kb(size)).padStart(5)} KB  ${file}`);
}

const total = files.reduce((sum, [, size]) => sum + size, 0);
console.log(`Initial JS: ${kb(total)} KB in ${files.length} file(s)  (limit: ${kb(MAX_BYTES)} KB)`);

if (total > MAX_BYTES) {
  console.error(`ERROR: Initial JS ${kb(total)} KB exceeds ${kb(MAX_BYTES)} KB limit — consider lazy-loading`);
  process.exit(1);
}

console.log('Bundle size OK');
