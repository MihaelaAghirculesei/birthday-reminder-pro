import { registerLocaleData } from '@angular/common';
import localeIt from '@angular/common/locales/it';
import { bootstrapApplication } from '@angular/platform-browser';

import * as Sentry from '@sentry/angular';

import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { environment } from './environments/environment';

if (environment.production && environment.sentryDsn) {
  Sentry.init({
    dsn: environment.sentryDsn,
    environment: 'production',
    // Disable performance tracing to preserve the free-tier error quota.
    tracesSampleRate: 0,
    integrations: [],
  });
}

registerLocaleData(localeIt);

bootstrapApplication(AppComponent, appConfig)
  .then((appRef) => {
    // Dynamic import — runs only during Cypress E2E tests, never in production.
    if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>)['Cypress']) {
      import('./testing/test-bridge').then(({ setupTestBridge }) => setupTestBridge(appRef));
    }
  })
  .catch((err) => {
    throw err;
  });
