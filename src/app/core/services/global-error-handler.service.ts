import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { NotificationService } from './notification.service';
import { LoggerService } from './logger.service';
import { ERROR_REPORTER, ErrorReporter } from './error-reporting.service';

interface ErrorContext {
  type: 'IndexedDB' | 'NgRx' | 'GoogleAPI' | 'Network' | 'Unknown';
  userMessage: string;
  technicalMessage: string;
}

interface GoogleAPIError {
  result?: {
    error?: {
      code?: number;
      message?: string;
    };
  };
  message?: string;
}

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
        technicalMessage: errorMessage
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
    if (!this.isErrorLike(error)) return false;
    return error.name === 'QuotaExceededError' ||
           error.name === 'InvalidStateError' ||
           (typeof error.message === 'string' &&
            (error.message.includes('IndexedDB') || error.message.includes('IDB')));
  }

  private isGoogleAPIError(error: unknown): error is GoogleAPIError {
    if (!this.isObject(error)) return false;

    const hasResultError = this.hasGoogleResultError(error);
    const hasGoogleMessage = this.hasGoogleMessage(error);

    return hasResultError || hasGoogleMessage;
  }

  private hasGoogleResultError(error: Record<string, unknown>): boolean {
    return typeof error['result'] === 'object' &&
           error['result'] !== null &&
           'error' in error['result'] &&
           typeof error['result']['error'] === 'object' &&
           error['result']['error'] !== null &&
           'code' in error['result']['error'] &&
           typeof (error['result']['error'] as Record<string, unknown>)['code'] === 'number';
  }

  private hasGoogleMessage(error: Record<string, unknown>): boolean {
    return typeof error['message'] === 'string' &&
           (error['message'].includes('gapi') || error['message'].includes('Google'));
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
    this.logger.error('Error:', error);
    this.logger.error('Technical:', context.technicalMessage);
    this.logger.error('User message:', context.userMessage);
    this.logger.groupEnd();
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
    } catch {
      // Silently fail - error reporting should never cause errors
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
