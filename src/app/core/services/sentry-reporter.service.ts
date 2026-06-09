import { inject, Injectable, InjectionToken } from '@angular/core';

import type { Scope } from '@sentry/browser';

import { environment } from '../../../environments/environment';
import { type ErrorReport, type ErrorReporter,ErrorReportingService } from './error-reporting.service';

export interface SentryClient {
  captureException(exception: unknown): string;
  withScope<T>(callback: (scope: Scope) => T): T;
}

// No factory: the token is provided at browser bootstrap via a dynamic import
// of @sentry/browser. SSR and non-production contexts leave it unset (null).
export const SENTRY_CLIENT = new InjectionToken<SentryClient>('SENTRY_CLIENT');

/**
 * Production error reporter: persists to IndexedDB (for local inspection)
 * and forwards to Sentry (for remote visibility) when a DSN is configured.
 *
 * In development (sentryDsn is empty) only the IndexedDB path runs,
 * so local errors never pollute the production Sentry project.
 */
@Injectable({ providedIn: 'root' })
export class SentryReporterService implements ErrorReporter {
  private readonly idbReporter = inject(ErrorReportingService);
  private readonly sentry = inject(SENTRY_CLIENT, { optional: true });

  captureError(report: ErrorReport): void {
    this.idbReporter.captureError(report);

    if (!environment.sentryDsn || !this.sentry) return;

    const sentry = this.sentry;
    sentry.withScope(scope => {
      scope.setTag('errorType', report.type);
      scope.setExtra('technicalMessage', report.technicalMessage);
      if (report.url) scope.setExtra('url', report.url);

      const exception =
        report.error instanceof Error
          ? report.error
          : new Error(report.technicalMessage);

      sentry.captureException(exception);
    });
  }
}
