import { APP_BASE_HREF } from '@angular/common';
import { CSP_NONCE } from '@angular/core';
import { CommonEngine } from '@angular/ssr/node';
import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import bootstrap from './src/main.server';
import { environment } from './src/environments/environment';
import { checkFirebaseOptions } from './src/app/firebase.config';

export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');

  const commonEngine = new CommonEngine();

  const indexHtmlTemplate = readFileSync(indexHtml, 'utf-8');

  server.set('trust proxy', 1);

  server.use(compression());

  server.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  server.get('*.*', express.static(browserDistFolder, {
    maxAge: '1y'
  }));

  const ssrLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,            
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: 'Too many requests, please try again later.',
  });

  server.get('*', ssrLimiter, (req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;
    const nonce = randomBytes(16).toString('base64');
    const document = indexHtmlTemplate.replace(
      '<app-root>',
      `<app-root ngCspNonce="${nonce}">`
    );

    commonEngine
      .render({
        bootstrap,
        document,
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: browserDistFolder,
        providers: [
          { provide: APP_BASE_HREF, useValue: baseUrl },
          { provide: CSP_NONCE, useValue: nonce },
        ],
      })
      .then((html) => {
        // Inject nonce into inline <script> tags (external scripts don't need it)
        html = html.replace(
          /<script(?![^>]*\bsrc\b)(?![^>]*\bnonce\b)([^>]*)>/gi,
          `<script$1 nonce="${nonce}">`
        );
        // Inject nonce into inline <style> tags (required for inlineCritical:true
        // and for Angular Material dynamic style injection via CSP_NONCE)
        html = html.replace(
          /<style(?![^>]*\bnonce\b)([^>]*)>/gi,
          `<style$1 nonce="${nonce}">`
        );

        const firebaseConfigured = checkFirebaseOptions(environment.firebase);

        // In non-production (staging/dev) use Report-Only mode so GIS violations
        // are surfaced in the browser console and network tab before enforcing in prod.
        // See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy-Report-Only
        const cspHeader = environment.production
          ? 'Content-Security-Policy'
          : 'Content-Security-Policy-Report-Only';

        const cspDirectives = [
          `default-src 'self'`,
          `script-src 'self' 'nonce-${nonce}' https://apis.google.com https://accounts.google.com https://*.gstatic.com`,
          `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com https://accounts.google.com`,
          `style-src-elem 'self' 'nonce-${nonce}' https://fonts.googleapis.com https://accounts.google.com`,
          `font-src 'self' https://fonts.gstatic.com data:`,
          `img-src 'self' data: blob: https:`,
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
          ].join(' '),
          // https://www.google.com is required for GIS One Tap / FedCM iframe
          `frame-src 'self' https://accounts.google.com https://www.google.com${firebaseConfigured ? ` https://${environment.firebase.authDomain}` : ''}`,
          `object-src 'none'`,
          `base-uri 'self'`,
          `form-action 'self' https://accounts.google.com`,
        ].join('; ');

        res.setHeader(cspHeader, cspDirectives);

        res.send(html);
      })
      .catch((err) => next(err));
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;

  const server = app();
  server.listen(port, () => {});
}

// Guard: only start the standalone HTTP server when executed directly.
// When imported by a Cloud Function, run() must NOT be called.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run();
}
