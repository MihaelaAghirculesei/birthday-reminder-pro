import { registerLocaleData } from '@angular/common';
import localeIt from '@angular/common/locales/it';
import { type Provider } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';

import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { SENTRY_CLIENT } from './app/core/services/sentry-reporter.service';
import { environment } from './environments/environment';

registerLocaleData(localeIt);

function launch(extraProviders: Provider[] = []): void {
  bootstrapApplication(AppComponent, {
    ...appConfig,
    providers: [...appConfig.providers, ...extraProviders],
  })
    .then((appRef) => {
      // Dynamic import — runs only during Cypress E2E tests, never in production.
      if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>)['Cypress']) {
        import('./testing/test-bridge').then(({ setupTestBridge }) => setupTestBridge(appRef));
      }
    })
    .catch((err) => { throw err; });
}

// Require a valid https:// DSN — Sentry logs console.error('Invalid Sentry Dsn')
// in production when the value is malformed, which breaks the Lighthouse
// errors-in-console audit.
const validSentryDsn = environment.production &&
  environment.sentryDsn &&
  environment.sentryDsn.startsWith('https://');

if (validSentryDsn) {
  // Dynamic import keeps @sentry/browser out of the static SSR module graph,
  // preventing Vite from creating a broken deps_ssr pre-bundle for it.
  import('@sentry/browser').then((sentry) => {
    sentry.init({
      dsn: environment.sentryDsn,
      environment: 'production',
      tracesSampleRate: 0,
      integrations: [],
    });
    launch([{ provide: SENTRY_CLIENT, useValue: sentry }]);
  });
} else {
  launch();
}
