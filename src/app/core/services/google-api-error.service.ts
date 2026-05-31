import { inject,Injectable } from '@angular/core';

import { LoggerService } from './logger.service';

export interface GoogleApiErrorDetails {
  code: number;
  message: string;
  status?: string;
  reason?: string;
  domain?: string;
  isRetryable: boolean;
  userMessage: string;
}

interface GoogleApiRawError {
  result?: {
    error?: {
      code?: number;
      message?: string;
      status?: string;
      errors?: {
        reason?: string;
        domain?: string;
        message?: string;
      }[];
    };
  };
  status?: number;
  message?: string;
}

const ERROR_MESSAGES: Record<number, string> = {
  400: 'Invalid request. Please check your data and try again.',
  401: 'Authentication expired. Please sign in again.',
  403: 'Access denied. Please check your permissions.',
  404: 'Calendar or event not found.',
  409: 'Conflict detected. The event may have been modified.',
  410: 'This event no longer exists.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'Google Calendar service error. Please try again later.',
  502: 'Google Calendar service temporarily unavailable.',
  503: 'Google Calendar service is busy. Please try again.',
  504: 'Request timeout. Please check your connection.'
};

const RETRYABLE_CODES = new Set([408, 429, 500, 502, 503, 504]);

@Injectable({
  providedIn: 'root'
})
export class GoogleApiErrorService {
  private readonly logger = inject(LoggerService);

  parseError(error: unknown, context?: string): GoogleApiErrorDetails {
    const rawError = error as GoogleApiRawError;

    const code = this.extractErrorCode(rawError);
    const message = this.extractErrorMessage(rawError);
    const status = rawError.result?.error?.status;
    const firstError = rawError.result?.error?.errors?.[0];

    const details: GoogleApiErrorDetails = {
      code,
      message,
      status,
      reason: firstError?.reason,
      domain: firstError?.domain,
      isRetryable: RETRYABLE_CODES.has(code),
      userMessage: this.getUserMessage(code, message)
    };

    this.logError(details, context);

    return details;
  }

  private extractErrorCode(error: GoogleApiRawError): number {
    return error.result?.error?.code || error.status || 0;
  }

  private extractErrorMessage(error: GoogleApiRawError): string {
    return error.result?.error?.message || error.message || 'Unknown error';
  }

  private getUserMessage(code: number, apiMessage: string): string {
    if (ERROR_MESSAGES[code]) {
      return ERROR_MESSAGES[code];
    }

    if (apiMessage.toLowerCase().includes('quota')) {
      return 'API quota exceeded. Please try again later.';
    }

    if (apiMessage.toLowerCase().includes('network')) {
      return 'Network error. Please check your connection.';
    }

    return 'An error occurred with Google Calendar. Please try again.';
  }

  private logError(details: GoogleApiErrorDetails, context?: string): void {
    const contextStr = context ? ` [${context}]` : '';

    this.logger.group(`[GoogleAPI Error]${contextStr}`);
    this.logger.error('Code:', details.code);
    this.logger.error('Message:', details.message);
    if (details.status) {
      this.logger.error('Status:', details.status);
    }
    if (details.reason) {
      this.logger.error('Reason:', details.reason);
    }
    this.logger.error('Retryable:', details.isRetryable);
    this.logger.groupEnd();
  }

  isAuthError(code: number): boolean {
    return code === 401 || code === 403;
  }

  isRateLimitError(code: number): boolean {
    return code === 429;
  }

  isServerError(code: number): boolean {
    return code >= 500 && code < 600;
  }

  shouldRetry(code: number): boolean {
    return RETRYABLE_CODES.has(code);
  }

  createError(details: GoogleApiErrorDetails, context?: string): Error {
    const contextStr = context ? `[${context}] ` : '';
    const error = new Error(`${contextStr}${details.userMessage}`);
    (error as Error & { googleApiDetails: GoogleApiErrorDetails }).googleApiDetails = details;
    return error;
  }
}
