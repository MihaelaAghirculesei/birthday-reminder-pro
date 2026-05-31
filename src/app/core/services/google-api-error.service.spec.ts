import { TestBed } from '@angular/core/testing';

import { provideTranslateTesting } from '../../testing/translate-testing';
import { type GoogleApiErrorDetails,GoogleApiErrorService } from './google-api-error.service';
import { LoggerService, SILENT_LOGGING } from './logger.service';

describe('GoogleApiErrorService', () => {
  let service: GoogleApiErrorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        GoogleApiErrorService,
        LoggerService,
        { provide: SILENT_LOGGING, useValue: true },
        provideTranslateTesting()
      ]
    });

    service = TestBed.inject(GoogleApiErrorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('parseError', () => {
    it('should parse Google API error with result structure', () => {
      const error = {
        result: {
          error: {
            code: 403,
            message: 'Access denied',
            status: 'PERMISSION_DENIED',
            errors: [{ reason: 'forbidden', domain: 'calendar' }]
          }
        }
      };

      const details = service.parseError(error, 'testContext');

      expect(details.code).toBe(403);
      expect(details.message).toBe('Access denied');
      expect(details.status).toBe('PERMISSION_DENIED');
      expect(details.reason).toBe('forbidden');
      expect(details.domain).toBe('calendar');
      expect(details.isRetryable).toBe(false);
    });

    it('should parse error with status only', () => {
      const error = { status: 500 };

      const details = service.parseError(error);

      expect(details.code).toBe(500);
      expect(details.isRetryable).toBe(true);
    });

    it('should handle unknown error structure', () => {
      const error = { message: 'Something went wrong' };

      const details = service.parseError(error);

      expect(details.code).toBe(0);
      expect(details.message).toBe('Something went wrong');
    });

    it('should provide user-friendly messages for known error codes', () => {
      const testCases: { code: number; expectedMessage: string }[] = [
        { code: 401, expectedMessage: 'Authentication expired. Please sign in again.' },
        { code: 403, expectedMessage: 'Access denied. Please check your permissions.' },
        { code: 404, expectedMessage: 'Calendar or event not found.' },
        { code: 429, expectedMessage: 'Too many requests. Please wait a moment and try again.' },
        { code: 500, expectedMessage: 'Google Calendar service error. Please try again later.' }
      ];

      testCases.forEach(({ code, expectedMessage }) => {
        const error = { result: { error: { code, message: 'API error' } } };
        const details = service.parseError(error);
        expect(details.userMessage).toBe(expectedMessage);
      });
    });

    it('should detect quota errors in message', () => {
      const error = { message: 'Quota exceeded for this API' };

      const details = service.parseError(error);

      expect(details.userMessage).toBe('API quota exceeded. Please try again later.');
    });

    it('should detect network errors in message', () => {
      const error = { message: 'Network connection failed' };

      const details = service.parseError(error);

      expect(details.userMessage).toBe('Network error. Please check your connection.');
    });
  });

  describe('error classification', () => {
    it('should identify auth errors', () => {
      expect(service.isAuthError(401)).toBe(true);
      expect(service.isAuthError(403)).toBe(true);
      expect(service.isAuthError(404)).toBe(false);
    });

    it('should identify rate limit errors', () => {
      expect(service.isRateLimitError(429)).toBe(true);
      expect(service.isRateLimitError(500)).toBe(false);
    });

    it('should identify server errors', () => {
      expect(service.isServerError(500)).toBe(true);
      expect(service.isServerError(502)).toBe(true);
      expect(service.isServerError(503)).toBe(true);
      expect(service.isServerError(400)).toBe(false);
    });

    it('should identify retryable errors', () => {
      expect(service.shouldRetry(408)).toBe(true);
      expect(service.shouldRetry(429)).toBe(true);
      expect(service.shouldRetry(500)).toBe(true);
      expect(service.shouldRetry(502)).toBe(true);
      expect(service.shouldRetry(503)).toBe(true);
      expect(service.shouldRetry(504)).toBe(true);
      expect(service.shouldRetry(400)).toBe(false);
      expect(service.shouldRetry(401)).toBe(false);
    });
  });

  describe('createError', () => {
    it('should create Error with context and user message', () => {
      const details: GoogleApiErrorDetails = {
        code: 403,
        message: 'API error message',
        isRetryable: false,
        userMessage: 'Access denied. Please check your permissions.'
      };

      const error = service.createError(details, 'syncBirthday');

      expect(error.message).toBe('[syncBirthday] Access denied. Please check your permissions.');
      expect((error as Error & { googleApiDetails: GoogleApiErrorDetails }).googleApiDetails).toBe(details);
    });

    it('should create Error without context', () => {
      const details: GoogleApiErrorDetails = {
        code: 500,
        message: 'Server error',
        isRetryable: true,
        userMessage: 'Google Calendar service error. Please try again later.'
      };

      const error = service.createError(details);

      expect(error.message).toBe('Google Calendar service error. Please try again later.');
    });
  });
});
