'use strict';

/**
 * Verifies the main Angular browser bundle does not exceed MAX_BYTES.
 * Run after `npm run build` or `npm run build:prod`.
 */

const fs = require('fs');
const path = require('path');

const BROWSER_DIR = path.join(__dirname, '..', 'dist', 'birthday-reminder-pro', 'browser');
const MAX_BYTES = 512_000; // 500 KB — keep in sync with angular.json budgets

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

const size = fs.statSync(path.join(BROWSER_DIR, mainFile)).size;
const sizeKb = Math.round(size / 1024);
const limitKb = MAX_BYTES / 1024;

console.log(`Main bundle: ${sizeKb} KB  (limit: ${limitKb} KB)  [${mainFile}]`);

if (size > MAX_BYTES) {
  console.error(`ERROR: Bundle ${sizeKb} KB exceeds ${limitKb} KB limit — consider lazy-loading`);
  process.exit(1);
}

console.log('Bundle size OK');
