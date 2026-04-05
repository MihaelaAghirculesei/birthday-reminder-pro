/**
 * Environment file initializer.
 *
 * Priority:
 *  1. CI/CD: FIREBASE_API_KEY is set in process.env (GitHub Secrets) →
 *     generate environment files from process.env directly.
 *  2. Local dev: .env.local exists in the project root →
 *     parse it, merge into process.env, then generate environment files.
 *  3. Fallback: copy *.example.ts templates so the app runs in demo/offline mode.
 *     Devs should create .env.local (from .env.local.example) and re-run
 *     `npm run env:init` — do NOT hardcode credentials in environment.ts.
 *
 * Note: Firebase web SDK credentials are NOT secrets — they are necessarily
 * embedded in the client bundle by design. Real security comes from:
 *   - API key HTTP referrer restrictions (Google Cloud Console)
 *   - Firebase Security Rules (server-side authorisation)
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT    = path.resolve(__dirname, '..');
const ENV_DIR = path.join(ROOT, 'src', 'environments');

// ─── .env.local parser (no external dependencies) ────────────────────────────

/**
 * Parse a .env-style file into a plain object.
 * Supports: KEY=value, KEY="value", KEY='value', blank lines, # comments.
 * Does NOT expand variable references — simple key=value only.
 */
function parseDotEnv(filePath) {
  const vars = {};
  const content = fs.readFileSync(filePath, 'utf8');

  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;

    const key = line.slice(0, eqIdx).trim();
    let   val = line.slice(eqIdx + 1).trim();

    // Strip surrounding quotes (single or double)
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }

    if (key) vars[key] = val;
  }

  return vars;
}

/**
 * Load .env.local (if present) into process.env without overwriting
 * values that were already set by the shell / CI environment.
 */
function loadDotEnvLocal() {
  const localFile = path.join(ROOT, '.env.local');
  if (!fs.existsSync(localFile)) return false;

  const vars = parseDotEnv(localFile);
  for (const [k, v] of Object.entries(vars)) {
    if (!process.env[k]) process.env[k] = v;
  }
  return true;
}

// ─── Environment file generator ───────────────────────────────────────────────

const REQUIRED_VARS = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID',
];

function hasAllVars() {
  return REQUIRED_VARS.every((v) => process.env[v]);
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

function generateFromVars(source) {
  const devPath  = path.join(ENV_DIR, 'environment.ts');
  const prodPath = path.join(ENV_DIR, 'environment.prod.ts');

  fs.writeFileSync(devPath,  buildEnvironmentContent(false));
  fs.writeFileSync(prodPath, buildEnvironmentContent(true));

  console.log(`Generated environment.ts and environment.prod.ts from ${source}.`);
}

// ─── Fallback: copy placeholder templates ────────────────────────────────────

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
    console.log(`Created ${target} from ${example} (placeholder values).`);
    created++;
  }

  if (created > 0) {
    console.log(
      'App will run in offline/demo mode.\n' +
      'To enable Firebase: copy .env.local.example → .env.local, fill in your\n' +
      'credentials, then re-run: npm run env:init'
    );
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

// 1. Try CI environment variables first (already in process.env)
if (hasAllVars()) {
  generateFromVars('CI environment variables');
} else {
  // 2. Try loading .env.local for local dev
  const loaded = loadDotEnvLocal();
  if (loaded && hasAllVars()) {
    generateFromVars('.env.local');
  } else {
    // 3. Fall back to placeholder templates
    if (loaded) {
      console.warn(
        'Warning: .env.local found but missing required Firebase variables.\n' +
        `Required: ${REQUIRED_VARS.join(', ')}`
      );
    }
    copyFromExamples();
  }
}
