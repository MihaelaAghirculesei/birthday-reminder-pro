module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    client: {
      jasmine: {
        random: false,
        seed: 42,
        stopSpecOnExpectationFailure: false,
        timeoutInterval: 10000
      },
      clearContext: false
    },
    jasmineHtmlReporter: {
      suppressAll: true
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/birthday-reminder-pro'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' },
        { type: 'lcovonly' },
        { type: 'json' },
        { type: 'json-summary' }
      ],
      check: {
        global: {
          statements: 91,
          branches: 85,
          functions: 91,
          lines: 92
        }
      }
    },
    reporters: ['progress', 'kjhtml', 'coverage'],
    browsers: ['ChromeHeadlessCI'],
    customLaunchers: {
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: [
          '--no-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-background-networking',
          '--disable-default-apps',
          '--disable-extensions',
          '--disable-translate',
          '--disable-sync',
          '--no-first-run',
          '--disable-component-extensions-with-background-pages',
          // Fixed port so the CI pipeline can attach DevTools for debugging.
          // Unit tests run sequentially in CI (see ci.yml), so no port conflict.
          '--remote-debugging-port=9222'
        ]
      }
    },
    forceKillTimeout: 10000,
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    singleRun: false,
    restartOnFileChange: true,
    browserDisconnectTimeout: 10000,
    browserDisconnectTolerance: 3,
    browserNoActivityTimeout: 60000,
    processKillTimeout: 10000,
    captureTimeout: 60000
  });
};
