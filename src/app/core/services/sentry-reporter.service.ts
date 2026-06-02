import { inject, Injectable, InjectionToken } from '@angular/core';

import * as Sentry from '@sentry/angular';

import { environment } from '../../../environments/environment';
import { type ErrorReport, type ErrorReporter,ErrorReportingService } from './error-reporting.service';

export interface SentryClient {
  captureException(exception: unknown): string;
  withScope<T>(callback: (scope: Sentry.Scope) => T): T;
}

export const SENTRY_CLIENT = new InjectionToken<SentryClient>('SENTRY_CLIENT', {
  factory: () => Sentry as unknown as SentryClient,
});

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
  private readonly sentry = inject(SENTRY_CLIENT);

  captureError(report: ErrorReport): void {
    this.idbReporter.captureError(report);

    if (!environment.sentryDsn) return;

    this.sentry.withScope(scope => {
      scope.setTag('errorType', report.type);
      scope.setExtra('technicalMessage', report.technicalMessage);
      if (report.url) scope.setExtra('url', report.url);

      const exception =
        report.error instanceof Error
          ? report.error
          : new Error(report.technicalMessage);

      this.sentry.captureException(exception);
    });
  }
}
