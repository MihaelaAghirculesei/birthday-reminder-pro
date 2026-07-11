import { registerLocaleData } from '@angular/common';
import localeIt from '@angular/common/locales/it';
import { bootstrapApplication } from '@angular/platform-browser';

import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { SentryClientHolder } from './app/core/services/sentry-reporter.service';
import { environment } from './environments/environment';

registerLocaleData(localeIt);

// Require a valid https:// DSN — Sentry logs console.error('Invalid Sentry Dsn')
// in production when the value is malformed, which breaks the Lighthouse
// errors-in-console audit.
const validSentryDsn = environment.production &&
  environment.sentryDsn &&
  environment.sentryDsn.startsWith('https://');

bootstrapApplication(AppComponent, appConfig)
  .then((appRef) => {
    // Dynamic import — runs only during Cypress E2E tests, never in production.
    if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>)['Cypress']) {
      import('./testing/test-bridge').then(({ setupTestBridge }) => setupTestBridge(appRef));
    }

    if (validSentryDsn) {
      // Loaded after the app is already bootstrapped and interactive — this chunk
      // is ~440 KB (Sentry's browser SDK bundles Session Replay, the Feedback
      // widget, tracing and profiling in one module with no lighter entry point),
      // far too heavy to make every user wait for it before they see the app.
      import('@sentry/browser').then(({ init, captureException, withScope }) => {
        init({
          dsn: environment.sentryDsn,
          environment: 'production',
          tracesSampleRate: 0,
          integrations: [],
        });
        appRef.injector.get(SentryClientHolder).client = { captureException, withScope };
      });
    }
  })
  .catch((err) => { throw err; });
