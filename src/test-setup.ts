// Every test must run at least one assertion. This catches tests that finish
// before an async callback (subscribe, then) gets to its expectations.
beforeEach(() => {
  expect.hasAssertions();
});

// Tests that drive time call vi.useFakeTimers(); never let them leak into the next test.
afterEach(() => {
  vi.useRealTimers();
});
