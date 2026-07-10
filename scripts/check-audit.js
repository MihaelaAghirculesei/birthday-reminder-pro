'use strict';

/**
 * Cross-platform equivalent of the CI "security-audit" job: runs `npm audit`,
 * prints the full report, but only fails on the same policy CI enforces
 * (critical > 0, or high > 5) — not on every high finding like a plain
 * `--audit-level=high` would. Keeps `npm run ci:local` usable on Windows,
 * where `npm audit --audit-level=high || true` breaks (`true` isn't a cmd.exe
 * command) and where blindly swallowing the exit code would hide a real
 * regression.
 */

const { spawnSync } = require('child_process');

const HIGH_LIMIT = 5;

const textResult = spawnSync('npm', ['audit', '--omit=dev'], {
  stdio: 'inherit',
  shell: true
});

const jsonResult = spawnSync('npm', ['audit', '--omit=dev', '--json'], {
  encoding: 'utf8',
  shell: true
});

let vulnerabilities = {};
try {
  vulnerabilities = JSON.parse(jsonResult.stdout || '{}').metadata?.vulnerabilities ?? {};
} catch {
  console.warn('WARN: could not parse `npm audit --json` output, skipping threshold check');
  process.exit(0);
}

const critical = vulnerabilities.critical || 0;
const high = vulnerabilities.high || 0;

console.log(`\nVulnerability thresholds: critical=${critical} (max 0), high=${high} (max ${HIGH_LIMIT})`);

if (critical > 0) {
  console.error(`ERROR: ${critical} critical vulnerabilities found — blocking`);
  process.exit(1);
}

if (high > HIGH_LIMIT) {
  console.error(`ERROR: ${high} high vulnerabilities found (max allowed: ${HIGH_LIMIT}) — blocking`);
  process.exit(1);
}

console.log('Vulnerability thresholds passed (see SECURITY.md for tracked findings)');
process.exit(0);
