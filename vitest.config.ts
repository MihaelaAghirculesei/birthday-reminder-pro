import { defineConfig } from 'vitest/config';

// Merged by the Angular unit-test builder (angular.json → test.runnerConfig).
export default defineConfig({
  test: {
    // Restore vi.spyOn spies after each test, as Jasmine did with spyOn.
    restoreMocks: true,
    browser: {
      // Failure screenshots would land in __screenshots__/ folders under src/.
      screenshotFailures: false,
    },
  },
});
