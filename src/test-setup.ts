// The app is zoneless; the build:test configuration loads zone.js only for tests,
// because fakeAsync/tick need each test to run in a ProxyZone (the Vitest patch
// wraps describe/it accordingly).
import 'zone.js/testing';
import 'zone.js/plugins/vitest-patch';

// Every test must run at least one assertion. This catches tests that finish
// before an async callback (subscribe, then) gets to its expectations.
beforeEach(() => {
  expect.hasAssertions();
});
