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
        stopSpecOnExpectationFailure: false
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
        { type: 'json' }
      ],
      check: {
        global: {
          statements: 80,
          branches: 75,
          functions: 80,
          lines: 80
        },
        each: {
          statements: 70,
          branches: 65,
          functions: 70,
          lines: 70
        }
      }
    },
    reporters: ['progress', 'kjhtml', 'coverage'],
    browsers: ['ChromeHeadlessNoNoise'],
    customLaunchers: {
      ChromeHeadlessNoNoise: {
        base: 'ChromeHeadless',
        flags: [
          '--disable-background-networking',
          '--disable-default-apps',
          '--disable-extensions',
          '--disable-translate',
          '--disable-sync',
          '--disable-component-extensions-with-background-pages',
          '--no-first-run'
        ]
      },
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
          '--disable-component-extensions-with-background-pages'
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
