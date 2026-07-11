import { defineConfig } from 'cypress';
import * as fs from 'fs';
import * as path from 'path';

export default defineConfig({
  trashAssetsBeforeRuns: false,
  e2e: {
    baseUrl: 'http://localhost:4203',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    setupNodeEvents(on, _config) {
      on('before:run', () => {
        const screenshotsDir = path.join(__dirname, 'cypress', 'screenshots');
        if (fs.existsSync(screenshotsDir)) {
          fs.rmSync(screenshotsDir, { recursive: true, force: true });
        }
      });

      on('task', {
        log(message: string) {
          if (!message.includes('ws://') && !message.includes('WebSocket')) {
            console.info(message);
          }
          return null;
        }
      });

      // Copy README screenshots to docs/screenshots/ so they resolve on GitHub
      on('after:screenshot', (details: Cypress.ScreenshotDetails) => {
        if (details.specName?.includes('readme-screenshots')) {
          const docsDir = path.join(__dirname, 'docs', 'screenshots');
          const dest = path.join(docsDir, path.basename(details.path));
          fs.copyFileSync(details.path, dest);
        }
      });
    },
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.ts',
  },
  component: {
    devServer: {
      framework: 'angular',
      bundler: 'webpack',
    },
    specPattern: '**/*.cy.ts',
  },
  retries: {
    runMode: 2,
    openMode: 0,
  },
  allowCypressEnv: false,
  defaultCommandTimeout: 10000,
  requestTimeout: 10000,
  responseTimeout: 10000,
  pageLoadTimeout: 60000,
});
