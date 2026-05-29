#!/usr/bin/env node
'use strict';

// Verifies that key Angular packages are fully installed after npm install.
// Runs automatically via the postinstall npm hook.
//
// WHY THIS EXISTS:
// C:/Users/LG/node_modules/ contains Angular v20 (a different project at the
// Windows home directory). npm 10 hoisting can create partial installs of
// Angular v19 packages in this project — placing fesm2022 bundles in
// node_modules/@angular/<pkg>/ but omitting root files like index.d.ts and
// package.json. TypeScript then falls back to the parent's v20 declarations,
// causing InjectionToken type mismatches at build time.

const { execSync } = require('child_process');
const { existsSync } = require('fs');
const { join } = require('path');
const { dependencies, devDependencies } = require('../package.json');

const root = join(__dirname, '..');
const allDeps = { ...dependencies, ...devDependencies };

const CRITICAL_ANGULAR = [
  '@angular/animations',
  '@angular/common',
  '@angular/compiler',
  '@angular/core',
  '@angular/forms',
  '@angular/platform-browser',
  '@angular/platform-browser-dynamic',
  '@angular/platform-server',
  '@angular/router',
];

const broken = [];

for (const pkg of CRITICAL_ANGULAR) {
  const indexDts = join(root, 'node_modules', ...pkg.split('/'), 'index.d.ts');
  if (!existsSync(indexDts)) {
    // Use the exact version from package.json (strip leading ^/~ for pinning)
    const range = allDeps[pkg] || '';
    const version = range.replace(/^[\^~>=]+/, '');
    broken.push(version ? `${pkg}@${version}` : pkg);
  }
}

if (broken.length === 0) {
  process.exit(0);
}

console.log('\n[postinstall] Incomplete Angular packages detected (index.d.ts missing):');
broken.forEach(p => console.log(`  - ${p}`));
console.log('[postinstall] Reinstalling with --force to bypass npm hoisting issue...\n');

try {
  execSync(`npm install ${broken.join(' ')} --prefer-offline --no-save --force`, {
    cwd: root,
    stdio: 'inherit',
  });
  console.log('\n[postinstall] Angular packages restored.\n');
} catch (err) {
  console.error('\n[postinstall] ERROR: reinstall failed. Run manually:');
  console.error(`  npm install ${broken.join(' ')} --force\n`);
  process.exit(1);
}
