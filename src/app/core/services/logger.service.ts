import { Injectable, InjectionToken, isDevMode, inject } from '@angular/core';

/**
 * Token to disable logging in tests
 */
export const SILENT_LOGGING = new InjectionToken<boolean>('SILENT_LOGGING');

/**
 * Centralized logger service that respects test environment
 * Provides consistent logging that can be easily mocked or silenced in tests
 */
@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private readonly isSilent = inject(SILENT_LOGGING, { optional: true }) ?? false;

  private isDebugEnabled(): boolean {
    return isDevMode() && !this.isSilent;
  }

  log(...args: unknown[]): void {
    if (this.isDebugEnabled()) {
      console.log(...args);
    }
  }

  info(...args: unknown[]): void {
    if (this.isDebugEnabled()) {
      console.info(...args);
    }
  }

  warn(...args: unknown[]): void {
    if (!this.isSilent) {
      console.warn(...args);
    }
  }

  error(...args: unknown[]): void {
    if (!this.isSilent) {
      console.error(...args);
    }
  }

  group(label: string): void {
    if (this.isDebugEnabled()) {
      console.group(label);
    }
  }

  groupEnd(): void {
    if (this.isDebugEnabled()) {
      console.groupEnd();
    }
  }
}

/**
 * Provider to silence logging in tests
 */
export const SILENT_LOGGER_PROVIDER = { provide: SILENT_LOGGING, useValue: true };
