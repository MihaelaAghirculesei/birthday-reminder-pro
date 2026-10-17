'use strict';

/**
 * Copies the client-side shell to 404.html. Run after `ng build`.
 *
 * Without a top-level 404.html, Cloudflare Pages treats the site as a SPA and
 * answers every unknown URL with index.html and status 200 (a soft 404).
 * With it, unknown URLs get status 404; the shell boots the app and the
 * router's '**' route renders NotFoundComponent.
 *
 * Client-only routes have no prerendered page, so src/_redirects rewrites
 * them to the same shell with status 200.
 */

const fs = require('fs');
const path = require('path');

const BROWSER_DIR = path.join(__dirname, '..', 'dist', 'birthday-reminder-pro', 'browser');
const SHELL = path.join(BROWSER_DIR, 'index.csr.html');

if (!fs.existsSync(SHELL)) {
  console.error('ERROR: index.csr.html not found — run "ng build" first');
  process.exit(1);
}

fs.copyFileSync(SHELL, path.join(BROWSER_DIR, '404.html'));
console.log('Created 404.html from index.csr.html');
