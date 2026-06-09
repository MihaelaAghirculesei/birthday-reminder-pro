module.exports = {
  ci: {
    collect: {
      startServerCommand: 'node dist/birthday-reminder-pro/server/server.mjs',
      // Wait for the SSR server to log its ready message before navigating.
      // Without this LHCI uses a fixed 10-second poll that races with Angular's
      // cold-start render and causes NO_NAVSTART on runs 2+.
      startServerReadyPattern: 'listening on',
      startServerReadyTimeout: 30000,
      url: ['http://localhost:4000'],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        maxWaitForLoad: 45000,
        skipAudits: ['uses-http2', 'valid-source-maps'],
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
        },
        screenEmulation: {
          mobile: false,
          width: 1350,
          height: 940,
          deviceScaleFactor: 1,
          disabled: false,
        },
      },
    },
    assert: {
      preset: 'lighthouse:no-pwa',
      assertions: {
        // Category gates — the only scores that matter in CI.
        // Performance on headless CI VMs is noisy; 0.4 floor catches true regressions.
        'categories:performance':    ['warn',  { minScore: 0.4 }],
        'categories:accessibility':  ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.85 }],
        'categories:seo':            ['error', { minScore: 0.9 }],

        // ── Individual perf timing metrics ───────────────────────────────────
        // CI headless numbers are meaningless for production perf budgets.
        // The category score above already aggregates all of these.
        'first-contentful-paint':  'off',
        'largest-contentful-paint': 'off',
        'speed-index':             'off',
        'interactive':             'off',
        'max-potential-fid':       'off',
        'total-blocking-time':     'off',
        'cumulative-layout-shift': 'off',

        // ── Security headers ─────────────────────────────────────────────────
        // csp-xss has scoreDisplayMode:'informative' — score is always null,
        // so minScore assertions always fail (LHCI converts null → 0).
        // Use maxLength:0 instead: fail if any finding appears in the audit table.
        'csp-xss': ['error', { maxLength: 0 }],

        // ── Minification ─────────────────────────────────────────────────────
        // Production build uses esbuild (optimization.scripts:true); all JS is
        // minified. Score < 0.9 means Lighthouse ran against a dev build.
        'unminified-javascript': ['error', { minScore: 0.9 }],

        // ── Lazy-loading / code-splitting ────────────────────────────────────
        // Firebase SDK chunks are intentionally deferred post-login.
        // Showing as "unused" on first load IS the correct behaviour.
        'unused-javascript': 'off',

        // ── Legacy JavaScript ────────────────────────────────────────────────
        // @sentry/browser ships one legacy-polyfill transform in its bundle
        // (regenerator-runtime for older async/await transpilation).  This is
        // a third-party artefact we cannot remove; the audit will always find
        // exactly 1 item when Sentry is included in the build.
        'legacy-javascript': 'off',

        // ── Image format & sizing ────────────────────────────────────────────
        // All flagged images are 46 px app icons also used in the Web Manifest
        // where PNG is required. WebP conversion would save <1 kB and breaks
        // the manifest icons. Not worth the complexity.
        'uses-responsive-images': 'off',
        'modern-image-formats':   'off',
        'image-delivery-insight': 'off',

        // ── Source maps ──────────────────────────────────────────────────────
        // Skipped in collect.settings.skipAudits (Lighthouse never runs it).
        // Must also be 'off' here or the preset's auditRan≥1 check fires.
        'valid-source-maps': 'off',

        // ── Non-composited animations ────────────────────────────────────────
        // The `expandCollapse` Angular animation was fixed to use only
        // composited properties (transform + opacity — no height).
        // Remaining box-shadow pulse effects (urgent birthday alerts, undo
        // buttons) are intentional UX affordances and run only when the
        // dashboard is loaded with user data — never on a fresh Lighthouse
        // scan of the unauthenticated empty-state page.
        'non-composited-animations': 'off',

        // ── Insight / diagnostic audits ──────────────────────────────────────
        // These are informational; CI is not the right place to gate on them.
        'network-dependency-tree-insight': 'off',
        'forced-reflow-insight':           'off',
        'cls-culprits-insight':            'off',
        'dom-size-insight':                'off',

        // ── Diagnostic / CI-environment performance audits ───────────────────
        // These are informational audits whose scores are null (not 0–1); any
        // minScore assertion automatically fails on null.  The category score
        // gate above (categories:performance ≥0.4) already guards regressions.
        'total-byte-weight':          'off',
        'bootup-time':                'off',
        'dom-size':                   'off',
        'mainthread-work-breakdown':  'off',
        'server-response-time':       'off',
        'first-meaningful-paint':     'off',
        'render-blocking-resources':  'off',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
