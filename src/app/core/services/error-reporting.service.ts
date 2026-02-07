import { Injectable, InjectionToken, isDevMode } from '@angular/core';

export interface ErrorReport {
  error: unknown;
  type: string;
  technicalMessage: string;
  timestamp: number;
  url?: string;
  userAgent?: string;
}

export interface ErrorReporter {
  captureError(report: ErrorReport): void;
}

export const ERROR_REPORTER = new InjectionToken<ErrorReporter>('ERROR_REPORTER');

@Injectable({
  providedIn: 'root'
})
export class ErrorReportingService implements ErrorReporter {
  private errorBuffer: ErrorReport[] = [];
  private readonly maxBufferSize = 50;

  captureError(report: ErrorReport): void {
    if (isDevMode()) {
      return;
    }

    this.errorBuffer.push(report);

    if (this.errorBuffer.length > this.maxBufferSize) {
      this.errorBuffer.shift();
    }
  }

  getRecentErrors(): ErrorReport[] {
    return [...this.errorBuffer];
  }

  clearErrors(): void {
    this.errorBuffer = [];
  }
}
