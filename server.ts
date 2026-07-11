import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { APP_BASE_HREF } from '@angular/common';
import { CSP_NONCE } from '@angular/core';
import { CommonEngine } from '@angular/ssr/node';
import compression from 'compression';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { checkFirebaseOptions } from './src/app/firebase.config';
import { environment } from './src/environments/environment';
import bootstrap from './src/main.server';

// Build CSP directives once per request using the per-request nonce.
function buildCsp(nonce: string): string {
  const firebaseConfigured = checkFirebaseOptions(environment.firebase);
  // Guard matches the one in main.ts — only treat the value as a URL if it
  // actually starts with https://, so placeholder strings like 'YOUR_SENTRY_DSN'
  // never reach new URL() and crash every SSR request with a TypeError.
  const sentryIngestUrl = environment.sentryDsn && environment.sentryDsn.startsWith('https://')
    ? `https://${new URL(environment.sentryDsn).host}`
    : null;
  return [
    `default-src 'self'`,
    // Complete strict-CSP pattern (web.dev/strict-csp):
    //   CSP3 → 'strict-dynamic' + nonce; all host/scheme allowlists are IGNORED
    //   CSP2 → nonce overrides 'unsafe-inline'; https:/http: allow same-origin chunks
    //   CSP1 → 'unsafe-inline' + https:/http: (all CSP1 browsers are EOL)
    // 'unsafe-inline', https:, http: are all IGNORED when 'strict-dynamic'+nonce
    // is present (CSP3). Lighthouse recommends keeping them as backward-compat
    // fallbacks; removing them adds a medium-severity finding to the csp-xss audit.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline' https: http:`,
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com https://accounts.google.com`,
    `style-src-elem 'self' 'nonce-${nonce}' https://fonts.googleapis.com https://accounts.google.com`,
    // Angular Material sets inline style="" attributes that cannot carry a nonce.
    `style-src-attr 'unsafe-inline'`,
    `font-src 'self' https://fonts.gstatic.com data:`,
    // Explicit origins instead of a bare 'https:' wildcard: Google profile photos,
    // Firebase Storage (user photo uploads, two historical hostnames), and the
    // two stock-photo APIs behind "Load Test Data" (Unsplash curated portraits,
    // pravatar.cc avatars). data:/blob: cover base64 photos and local previews.
    `img-src 'self' data: blob: https://lh3.googleusercontent.com https://firebasestorage.googleapis.com https://storage.googleapis.com https://images.unsplash.com https://i.pravatar.cc`,
    [
      `connect-src 'self'`,
      `https://www.googleapis.com`,
      `https://accounts.google.com`,
      `https://oauth2.googleapis.com`,
      `https://identitytoolkit.googleapis.com`,
      `https://firebaseinstallations.googleapis.com`,
      `https://securetoken.googleapis.com`,
      `https://firestore.googleapis.com`,
      `https://lh3.googleusercontent.com`,
      ...(firebaseConfigured ? ['https://firebasestorage.googleapis.com'] : []),
      ...(sentryIngestUrl ? [sentryIngestUrl] : []),
    ].join(' '),
    // https://www.google.com required for GIS One Tap / FedCM iframe
    `frame-src 'self' https://accounts.google.com https://www.google.com${firebaseConfigured ? ` https://${environment.firebase.authDomain}` : ''}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self' https://accounts.google.com`,
  ].join('; ');
}

export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');

  const commonEngine = new CommonEngine({
    // Angular 19 requires an explicit allowedHosts list to enable SSR.
    // Without it the engine throws and returns 500.
    // 'localhost' covers Lighthouse CI; the Pages domain covers production.
    allowedHosts: ['localhost', '127.0.0.1', 'birthday-reminder-aghirculesei.pages.dev'],
  });
  const indexHtmlTemplate = readFileSync(indexHtml, 'utf-8');

  server.set('trust proxy', 1);
  server.use(compression());
  server.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  }));
  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  // ── CSP middleware ───────────────────────────────────────────────────────────
  // Runs first, before every route handler including express.static.
  // Stores the nonce in res.locals so the SSR handler can reuse it.
  // Guarantees the CSP header is present on ALL responses — HTML, static
  // assets, error pages — regardless of what happens downstream.
  const cspHeaderName = environment.production
    ? 'Content-Security-Policy'
    : 'Content-Security-Policy-Report-Only';

  server.use((_req, res, next) => {
    const nonce = randomBytes(16).toString('base64');
    res.locals['cspNonce'] = nonce;
    res.setHeader(cspHeaderName, buildCsp(nonce));
    next();
  });

  // ── Static assets ────────────────────────────────────────────────────────────
  // Redirect /index.html → / so SSR (with correct nonce injection) always serves HTML.
  server.get('/index.html', (_req, res) => res.redirect(301, '/'));

  server.get('*.*', express.static(browserDistFolder, { maxAge: '1y' }));

  // ── Rate limiter for SSR routes ──────────────────────────────────────────────
  const ssrLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: 'Too many requests, please try again later.',
  });

  // ── SSR route ────────────────────────────────────────────────────────────────
  server.get('*', ssrLimiter, (req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;
    // Reuse the nonce that the CSP middleware already stamped into the header.
    const nonce = res.locals['cspNonce'] as string;

    const document = indexHtmlTemplate.replace(
      '<app-root>',
      `<app-root ngCspNonce="${nonce}">`
    );

    const renderPromise = commonEngine.render({
      bootstrap,
      document,
      url: `${protocol}://${headers.host}${originalUrl}`,
      publicPath: browserDistFolder,
      providers: [
        { provide: APP_BASE_HREF, useValue: baseUrl },
        { provide: CSP_NONCE, useValue: nonce },
      ],
    });

    // Guard against a hanging SSR render keeping Chrome's trace open indefinitely,
    // which manifests as NO_NAVSTART in Lighthouse CI on runs 2+.
    const renderTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('SSR render timed out after 30 s')), 30_000)
    );

    Promise.race([renderPromise, renderTimeout])
      .then((html) => {
        // Stamp nonce on ALL <script> tags — required for 'strict-dynamic' in CSP3.
        html = html.replace(
          /<script(?![^>]*\bnonce\b)([^>]*)>/gi,
          `<script$1 nonce="${nonce}">`
        );
        // Inject nonce into inline <style> tags (required for inlineCritical:true
        // and Angular Material dynamic style injection via CSP_NONCE).
        html = html.replace(
          /<style(?![^>]*\bnonce\b)([^>]*)>/gi,
          `<style$1 nonce="${nonce}">`
        );
        res.send(html);
      })
      .catch((err) => next(err));
  });

  // Log unhandled Express errors to stdout so they appear in LHCI server output.
  server.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[SSR] Unhandled error:', err?.message ?? String(err));
    if (err?.stack) console.error(err.stack);
    res.status(500).send('Internal Server Error');
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;
  const server = app();
  server.listen(port, () => {
    console.info(`Node SSR server listening on http://localhost:${port}`);
  });
}

// Guard: only start the HTTP server when executed as a CLI script, not when imported as a module.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run();
}
