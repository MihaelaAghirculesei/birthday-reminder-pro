import { Injectable, InjectionToken, isDevMode, Inject, Optional } from '@angular/core';

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
  private readonly isSilent: boolean;

  constructor(@Optional() @Inject(SILENT_LOGGING) silentLogging: boolean | null) {
    this.isSilent = silentLogging ?? false;
  }

  private shouldLog(): boolean {
    return isDevMode() && !this.isSilent;
  }

  log(...args: unknown[]): void {
    if (this.shouldLog()) {
      console.log(...args);
    }
  }

  info(...args: unknown[]): void {
    if (this.shouldLog()) {
      console.info(...args);
    }
  }

  warn(...args: unknown[]): void {
    if (this.shouldLog()) {
      console.warn(...args);
    }
  }

  error(...args: unknown[]): void {
    if (this.shouldLog()) {
      console.error(...args);
    }
  }

  group(label: string): void {
    if (this.shouldLog()) {
      console.group(label);
    }
  }

  groupEnd(): void {
    if (this.shouldLog()) {
      console.groupEnd();
    }
  }
}

/**
 * Provider to silence logging in tests
 */
export const SILENT_LOGGER_PROVIDER = { provide: SILENT_LOGGING, useValue: true };
