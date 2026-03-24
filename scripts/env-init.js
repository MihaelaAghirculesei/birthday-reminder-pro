/**
 * Environment file initializer.
 *
 * Priority:
 *  1. If FIREBASE_API_KEY env var is set (CI/CD), generate environment files
 *     from process.env — credentials come from GitHub Secrets, never from disk.
 *  2. Otherwise, copy from the *.example.ts templates (local dev fallback).
 *     Devs then fill in their own credentials in the generated files.
 *
 * Note: Firebase web SDK credentials are NOT secrets — they are necessarily
 * embedded in the client bundle by design. Real security comes from:
 *   - API key HTTP referrer restrictions (Google Cloud Console)
 *   - Firebase Security Rules (server-side authorisation)
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ENV_DIR = path.resolve(__dirname, '..', 'src', 'environments');

// ─── CI: generate from environment variables ─────────────────────────────────

const REQUIRED_CI_VARS = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID',
];

function hasAllCiVars() {
  return REQUIRED_CI_VARS.every((v) => process.env[v]);
}

function buildEnvironmentContent(isProduction) {
  const clientId      = process.env.GOOGLE_CLIENT_ID ?? '';
  const errorEndpoint = process.env.ERROR_REPORTING_ENDPOINT;

  return [
    `export const environment = {`,
    `  production: ${isProduction},`,
    `  errorReportingEndpoint: ${errorEndpoint ? `'${errorEndpoint}'` : 'undefined as string | undefined'},`,
    `  googleCalendar: {`,
    `    clientId: '${clientId}'`,
    `  },`,
    `  googleAuthClientId: '${clientId}',`,
    `  firebase: {`,
    `    apiKey: '${process.env.FIREBASE_API_KEY}',`,
    `    authDomain: '${process.env.FIREBASE_AUTH_DOMAIN}',`,
    `    projectId: '${process.env.FIREBASE_PROJECT_ID}',`,
    `    storageBucket: '${process.env.FIREBASE_STORAGE_BUCKET}',`,
    `    messagingSenderId: '${process.env.FIREBASE_MESSAGING_SENDER_ID}',`,
    `    appId: '${process.env.FIREBASE_APP_ID}'`,
    `  }`,
    `};`,
    ``,
  ].join('\n');
}

function generateFromEnvVars() {
  const devPath  = path.join(ENV_DIR, 'environment.ts');
  const prodPath = path.join(ENV_DIR, 'environment.prod.ts');

  fs.writeFileSync(devPath,  buildEnvironmentContent(false));
  fs.writeFileSync(prodPath, buildEnvironmentContent(true));

  console.log('Generated environment.ts and environment.prod.ts from CI secrets.');
}

// ─── Local dev: copy from example templates ───────────────────────────────────

const TEMPLATES = [
  { example: 'environment.example.ts',      target: 'environment.ts' },
  { example: 'environment.prod.example.ts', target: 'environment.prod.ts' },
];

function copyFromExamples() {
  let created = 0;

  for (const { example, target } of TEMPLATES) {
    const targetPath  = path.join(ENV_DIR, target);
    const examplePath = path.join(ENV_DIR, example);

    if (fs.existsSync(targetPath)) continue;

    if (!fs.existsSync(examplePath)) {
      console.error(`Missing template: ${example}`);
      process.exit(1);
    }

    fs.copyFileSync(examplePath, targetPath);
    console.log(`Created ${target} from ${example}`);
    created++;
  }

  if (created > 0) {
    console.log(
      `Initialized ${created} environment file(s). Fill in your credentials (files are gitignored).`
    );
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

if (hasAllCiVars()) {
  generateFromEnvVars();
} else {
  copyFromExamples();
}
