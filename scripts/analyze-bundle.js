'use strict';

/**
 * Prints the largest browser output chunks and their top contributing source
 * modules, reading the esbuild metafile from `ng build --stats-json`.
 *
 * Angular 17+ uses esbuild for production builds, which writes an esbuild
 * metafile (`{ inputs, outputs }`), not a Webpack stats.json — so
 * `webpack-bundle-analyzer` can't parse it ("No bundles were parsed").
 * This script reads the real format directly. Run via `npm run analyze`.
 */

const fs = require('fs');
const path = require('path');

const STATS_PATH = path.join(__dirname, '..', 'dist', 'birthday-reminder-pro', 'stats.json');
const TOP_CHUNKS = 15;
const TOP_MODULES_PER_CHUNK = 6;

if (!fs.existsSync(STATS_PATH)) {
  console.error(`ERROR: ${STATS_PATH} not found — run "npm run build:stats" first`);
  process.exit(1);
}

const { outputs } = JSON.parse(fs.readFileSync(STATS_PATH, 'utf-8'));

const browserChunks = Object.entries(outputs)
  .filter(([file]) => /^(chunk-|main-|polyfills-)[^/]+\.js$/.test(file))
  .sort(([, a], [, b]) => b.bytes - a.bytes)
  .slice(0, TOP_CHUNKS);

for (const [file, meta] of browserChunks) {
  console.log(`\n${file}  (${Math.round(meta.bytes / 1024)} KB)`);
  const inputs = Object.entries(meta.inputs || {})
    .sort(([, a], [, b]) => b.bytesInOutput - a.bytesInOutput)
    .slice(0, TOP_MODULES_PER_CHUNK);
  for (const [inputFile, inputMeta] of inputs) {
    console.log(`   ${String(Math.round(inputMeta.bytesInOutput / 1024)).padStart(4)} KB  ${inputFile}`);
  }
}
