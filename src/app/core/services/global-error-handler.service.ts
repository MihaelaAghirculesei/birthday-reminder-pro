import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { NotificationService } from './notification.service';
import { LoggerService } from './logger.service';
import { ERROR_REPORTER, ErrorReporter } from './error-reporting.service';
import { IdbError } from '../errors/app-errors';

interface ErrorContext {
  type: 'IndexedDB' | 'NgRx' | 'GoogleAPI' | 'Network' | 'Unknown';
  userMessage: string;
  technicalMessage: string;
}

interface GoogleResultAPIError {
  readonly result: {
    readonly error: {
      readonly code: number;
      readonly message?: string;
    };
  };
  readonly message?: string;
}

interface GoogleMessageAPIError {
  readonly result?: undefined;
  readonly message: string;
}

type GoogleAPIError = GoogleResultAPIError | GoogleMessageAPIError;

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(
    private injector: Injector,
    private logger: LoggerService
  ) {}

  handleError(error: unknown): void {
    const context = this.categorizeError(error);

    this.logError(error, context);
    this.reportError(error, context);
    this.notifyUser(context);
  }

  private categorizeError(error: unknown): ErrorContext {
    const errorMessage = this.getErrorMessage(error);

    if (this.isIndexedDBError(error)) {
      return {
        type: 'IndexedDB',
        userMessage: 'Failed to save data locally. Please check storage permissions.',
        technicalMessage: errorMessage
      };
    }

    if (this.isGoogleAPIError(error)) {
      return {
        type: 'GoogleAPI',
        userMessage: 'Google Calendar sync failed. Please try again.',
        technicalMessage: this.getGoogleAPIErrorMessage(error)
      };
    }

    if (this.isNetworkError(error)) {
      return {
        type: 'Network',
        userMessage: 'Network connection lost. Changes will sync when online.',
        technicalMessage: errorMessage
      };
    }

    if (this.isNgRxError(error)) {
      return {
        type: 'NgRx',
        userMessage: 'An unexpected error occurred. Please refresh the page.',
        technicalMessage: errorMessage
      };
    }

    return {
      type: 'Unknown',
      userMessage: 'An unexpected error occurred.',
      technicalMessage: errorMessage
    };
  }

  private isIndexedDBError(error: unknown): boolean {
    // Custom error classes thrown by application code (most reliable check).
    if (error instanceof IdbError) return true;
    // Native browser DOMExceptions — cannot be subclassed, detected by name.
    if (!this.isErrorLike(error)) return false;
    return error.name === 'QuotaExceededError' || error.name === 'InvalidStateError';
  }

  private isGoogleAPIError(error: unknown): error is GoogleAPIError {
    if (!this.isObject(error)) return false;
    return this.hasGoogleResultError(error) || this.hasGoogleMessage(error);
  }

  private hasGoogleResultError(error: unknown): error is GoogleResultAPIError {
    if (!this.isObject(error)) return false;
    const result = error['result'];
    if (!this.isObject(result)) return false;
    const resultError = result['error'];
    return this.isObject(resultError) && typeof resultError['code'] === 'number';
  }

  private hasGoogleMessage(error: unknown): error is GoogleMessageAPIError {
    if (!this.isObject(error)) return false;
    const { message } = error;
    return typeof message === 'string' &&
           (message.includes('gapi') || message.includes('Google'));
  }

  private getGoogleAPIErrorMessage(error: GoogleAPIError): string {
    if (error.result !== undefined) {
      // Narrowed to GoogleResultAPIError — no optional chaining needed
      const { code, message } = error.result.error;
      return `Google API error ${code}: ${message ?? 'No message'}`;
    }
    // Narrowed to GoogleMessageAPIError — message is guaranteed string
    return error.message;
  }

  private isNetworkError(error: unknown): boolean {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true;
    }
    if (!this.isErrorLike(error)) return false;
    return typeof error.message === 'string' &&
           (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'));
  }

  private isNgRxError(error: unknown): boolean {
    if (!this.isErrorLike(error)) return false;
    return typeof error.message === 'string' &&
           (error.message.includes('Effect') ||
            error.message.includes('Action') ||
            error.message.includes('Reducer'));
  }

  private isErrorLike(error: unknown): error is Error {
    return error instanceof Error ||
           (this.isObject(error) && 'message' in error && 'name' in error);
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (this.isObject(error) && 'message' in error && typeof error['message'] === 'string') {
      return error['message'];
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'Unknown error';
  }

  private logError(error: unknown, context: ErrorContext): void {
    this.logger.group(`🔴 ${context.type} Error`);
    try {
      this.logger.error('Error:', error);
      this.logger.error('Technical:', context.technicalMessage);
      this.logger.error('User message:', context.userMessage);
    } finally {
      this.logger.groupEnd();
    }
  }

  private reportError(error: unknown, context: ErrorContext): void {
    try {
      const reporter = this.injector.get(ERROR_REPORTER) as ErrorReporter;
      reporter.captureError({
        error,
        type: context.type,
        technicalMessage: context.technicalMessage,
        timestamp: Date.now(),
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
      });
    } catch (reporterError) {
      // Use console.error as the last-resort fallback — this.logger itself may
      // be broken, but console.error is a browser primitive that never throws.
      // Log both the reporter failure and the original error so neither is lost.
      console.error('[GlobalErrorHandler] Error reporter failed:', reporterError);
      console.error('[GlobalErrorHandler] Original unhandled error:', error);
    }
  }

  private notifyUser(context: ErrorContext): void {
    try {
      const notificationService = this.injector.get(NotificationService);

      if (context.type === 'Network') {
        notificationService.show(context.userMessage, 'warning', 5000);
      } else if (context.type === 'IndexedDB') {
        notificationService.show(context.userMessage, 'error', 7000);
      } else {
        notificationService.show(context.userMessage, 'error', 5000);
      }
    } catch (e) {
      this.logger.error('Failed to show error notification:', e);
    }
  }
}
