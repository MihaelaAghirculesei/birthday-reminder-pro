import { inject,Injectable } from '@angular/core';

import type { Scope } from '@sentry/browser';

import { environment } from '../../../environments/environment';
import { type ErrorReport, type ErrorReporter,ErrorReportingService } from './error-reporting.service';

export interface SentryClient {
  captureException(exception: unknown): string;
  withScope<T>(callback: (scope: Scope) => T): T;
}

/**
 * Mutable holder for the Sentry client, set once the `@sentry/browser` chunk
 * finishes loading. Bootstrap doesn't wait for that chunk (see main.ts), so
 * this starts as `null` and is filled in asynchronously, shortly after the
 * app is already interactive. SSR and non-production contexts leave it null.
 */
@Injectable({ providedIn: 'root' })
export class SentryClientHolder {
  client: SentryClient | null = null;
}

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
  private readonly sentryHolder = inject(SentryClientHolder);

  captureError(report: ErrorReport): void {
    this.idbReporter.captureError(report);

    const sentry = this.sentryHolder.client;
    if (!environment.sentryDsn || !sentry) return;

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
