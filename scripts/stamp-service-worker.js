'use strict';

/**
 * Stamps ngsw-worker.js with a hash of src/_headers. Run after `ng build`.
 *
 * A service worker runs under the CSP its script was served with, and the
 * browser only replaces an installed worker when the script's bytes change.
 * ngsw-worker.js is byte-identical across builds of the same Angular version,
 * so a CSP change in src/_headers never reaches visitors who already have the
 * worker: it keeps fetching under the old connect-src and blocks what the new
 * policy allows (seen as auth/internal-error on Google sign-in).
 *
 * The stamp makes the script change whenever the headers change, so every
 * browser installs the new worker together with the new policy. The worker is
 * not part of ngsw.json's hash table, so the comment does not affect integrity
 * checks.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WORKER = path.join(ROOT, 'dist', 'birthday-reminder-pro', 'browser', 'ngsw-worker.js');
const HEADERS = path.join(ROOT, 'src', '_headers');
const MARKER = '// headers-sha256:';

if (!fs.existsSync(WORKER)) {
  console.error('ERROR: ngsw-worker.js not found — run "ng build" first');
  process.exit(1);
}

const hash = crypto.createHash('sha256').update(fs.readFileSync(HEADERS)).digest('hex');
const source = fs.readFileSync(WORKER, 'utf8').replace(new RegExp(`\\n${MARKER}.*\\n?$`), '');

fs.writeFileSync(WORKER, `${source.replace(/\n?$/, '\n')}${MARKER} ${hash}\n`);
console.log(`Stamped ngsw-worker.js with headers-sha256 ${hash.slice(0, 12)}`);
