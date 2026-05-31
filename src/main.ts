import { registerLocaleData } from '@angular/common';
import localeIt from '@angular/common/locales/it';
import { bootstrapApplication } from '@angular/platform-browser';

import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

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
