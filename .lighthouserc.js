module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist/birthday-reminder-pro/browser',
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

        // ── Lazy-loading / code-splitting ────────────────────────────────────
        // Firebase SDK chunks are intentionally deferred post-login.
        // Showing as "unused" on first load IS the correct behaviour.
        'unused-javascript': 'off',

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

        // ── Insight / diagnostic audits ──────────────────────────────────────
        // These are informational; CI is not the right place to gate on them.
        'network-dependency-tree-insight': 'off',
        'forced-reflow-insight':           'off',
        'cls-culprits-insight':            'off',
        'dom-size-insight':                'off',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
