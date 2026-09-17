import * as fs from 'fs';
import * as path from 'path';

import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

/**
 * Node-side only (uses `fs`) — imported exclusively from cypress.config.ts's
 * setupNodeEvents. Never import this from cypress/support/*, which runs in
 * the browser and has no access to the filesystem.
 */

export interface VisualDiffResult {
  name: string;
  status: 'match' | 'diff' | 'new-baseline' | 'size-mismatch';
  diffPercentage?: number;
  diffPixels?: number;
  totalPixels?: number;
}

/** Percentage of differing pixels above which a screenshot is flagged as a regression. */
const THRESHOLD_PERCENT = 0.1;

export function compareScreenshotToBaseline(
  screenshotPath: string,
  baselineDir: string,
  diffDir: string
): VisualDiffResult {
  const name = path.basename(screenshotPath, '.png');
  const baselinePath = path.join(baselineDir, `${name}.png`);

  if (!fs.existsSync(screenshotPath)) {
    return { name, status: 'size-mismatch' };
  }

  if (!fs.existsSync(baselinePath)) {
    // First time this screenshot is captured — adopt it as the baseline rather
    // than failing, so `npm run e2e:visual` doubles as the baseline-generation run.
    fs.mkdirSync(baselineDir, { recursive: true });
    fs.copyFileSync(screenshotPath, baselinePath);
    return { name, status: 'new-baseline' };
  }

  const actual = PNG.sync.read(fs.readFileSync(screenshotPath));
  const baseline = PNG.sync.read(fs.readFileSync(baselinePath));

  if (actual.width !== baseline.width || actual.height !== baseline.height) {
    return { name, status: 'size-mismatch' };
  }

  const { width, height } = actual;
  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(actual.data, baseline.data, diff.data, width, height, { threshold: 0.1 });
  const totalPixels = width * height;
  const diffPercentage = (diffPixels / totalPixels) * 100;

  if (diffPercentage > THRESHOLD_PERCENT) {
    fs.mkdirSync(diffDir, { recursive: true });
    fs.writeFileSync(path.join(diffDir, `${name}.diff.png`), PNG.sync.write(diff));
    return { name, status: 'diff', diffPercentage, diffPixels, totalPixels };
  }

  return { name, status: 'match', diffPercentage, diffPixels, totalPixels };
}
