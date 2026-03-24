import { TestBed } from '@angular/core/testing';
import { GlobalErrorHandler } from './global-error-handler.service';
import { NotificationService } from './notification.service';
import { ErrorReporter, ERROR_REPORTER } from './error-reporting.service';
import { SILENT_LOGGER_PROVIDER } from './logger.service';
import { provideTranslateTesting } from '../../testing/translate-testing';

describe('GlobalErrorHandler', () => {
  let errorHandler: GlobalErrorHandler;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
  let errorReporterSpy: jasmine.SpyObj<ErrorReporter>;

  beforeEach(() => {
    notificationServiceSpy = jasmine.createSpyObj('NotificationService', ['show']);
    errorReporterSpy = jasmine.createSpyObj('ErrorReporter', ['captureError']);

    TestBed.configureTestingModule({
      providers: [
        GlobalErrorHandler,
        SILENT_LOGGER_PROVIDER,
        provideTranslateTesting(),
        { provide: ERROR_REPORTER, useValue: errorReporterSpy },
        { provide: NotificationService, useValue: notificationServiceSpy }
      ]
    });

    errorHandler = TestBed.inject(GlobalErrorHandler);
  });

  it('should create', () => {
    expect(errorHandler).toBeTruthy();
  });

  describe('IndexedDB errors', () => {
    it('should categorize QuotaExceededError as IndexedDB error', () => {
      const error = new Error('Storage quota exceeded');
      error.name = 'QuotaExceededError';

      errorHandler.handleError(error);

      expect(notificationServiceSpy.show).toHaveBeenCalledWith(
        'Failed to save data locally. Please check storage permissions.',
        'error',
        7000
      );
    });

    it('should categorize InvalidStateError as IndexedDB error', () => {
      const error = new Error('Invalid state');
      error.name = 'InvalidStateError';

      errorHandler.handleError(error);

      expect(notificationServiceSpy.show).toHaveBeenCalledWith(
        'Failed to save data locally. Please check storage permissions.',
        'error',
        7000
      );
    });

    it('should categorize error with IndexedDB in message as IndexedDB error', () => {
      const error = new Error('IndexedDB transaction failed');

      errorHandler.handleError(error);

      expect(notificationServiceSpy.show).toHaveBeenCalledWith(
        'Failed to save data locally. Please check storage permissions.',
        'error',
        7000
      );
    });
  });

  describe('Google API errors', () => {
    it('should categorize errors with gapi in message as GoogleAPI error', () => {
      const error = new Error('gapi is not defined');

      errorHandler.handleError(error);

      expect(notificationServiceSpy.show).toHaveBeenCalledWith(
        'Google Calendar sync failed. Please try again.',
        'error',
        5000
      );
    });

    it('should categorize errors with Google in message as GoogleAPI error', () => {
      const error = new Error('Google authentication failed');

      errorHandler.handleError(error);

      expect(notificationServiceSpy.show).toHaveBeenCalledWith(
        'Google Calendar sync failed. Please try again.',
        'error',
        5000
      );
    });

    it('should categorize errors with result.error.code as GoogleAPI error', () => {
      const error = {
        result: { error: { code: 401 } },
        message: 'Unauthorized'
      };

      errorHandler.handleError(error);

      expect(notificationServiceSpy.show).toHaveBeenCalledWith(
        'Google Calendar sync failed. Please try again.',
        'error',
        5000
      );
    });

    it('should produce structured technicalMessage for result-based Google API errors', () => {
      const error = { result: { error: { code: 403, message: 'Forbidden' } } };

      errorHandler.handleError(error);

      const report = errorReporterSpy.captureError.calls.mostRecent().args[0];
      expect(report.technicalMessage).toBe('Google API error 403: Forbidden');
    });

    it('should fall back to "No message" when result.error.message is absent', () => {
      const error = { result: { error: { code: 401 } } };

      errorHandler.handleError(error);

      const report = errorReporterSpy.captureError.calls.mostRecent().args[0];
      expect(report.technicalMessage).toBe('Google API error 401: No message');
    });

    it('should use the error message string for message-based Google API errors', () => {
      const error = new Error('gapi is not defined');

      errorHandler.handleError(error);

      const report = errorReporterSpy.captureError.calls.mostRecent().args[0];
      expect(report.technicalMessage).toBe('gapi is not defined');
    });
  });

  describe('Network errors', () => {
    it('should categorize "Failed to fetch" as network error', () => {
      const error = new TypeError('Failed to fetch');

      errorHandler.handleError(error);

      expect(notificationServiceSpy.show).toHaveBeenCalledWith(
        'Network connection lost. Changes will sync when online.',
        'warning',
        5000
      );
    });

    it('should categorize NetworkError as network error', () => {
      const error = new Error('NetworkError when attempting to fetch resource');

      errorHandler.handleError(error);

      expect(notificationServiceSpy.show).toHaveBeenCalledWith(
        'Network connection lost. Changes will sync when online.',
        'warning',
        5000
      );
    });
  });

  describe('NgRx errors', () => {
    it('should categorize Effect errors as NgRx error', () => {
      const error = new Error('Effect dispatched an invalid action');

      errorHandler.handleError(error);

      expect(notificationServiceSpy.show).toHaveBeenCalledWith(
        'An unexpected error occurred. Please refresh the page.',
        'error',
        5000
      );
    });

    it('should categorize Action errors as NgRx error', () => {
      const error = new Error('Action must have a type property');

      errorHandler.handleError(error);

      expect(notificationServiceSpy.show).toHaveBeenCalledWith(
        'An unexpected error occurred. Please refresh the page.',
        'error',
        5000
      );
    });

    it('should categorize Reducer errors as NgRx error', () => {
      const error = new Error('Reducer returned undefined');

      errorHandler.handleError(error);

      expect(notificationServiceSpy.show).toHaveBeenCalledWith(
        'An unexpected error occurred. Please refresh the page.',
        'error',
        5000
      );
    });
  });

  describe('Unknown errors', () => {
    it('should categorize unrecognized errors as Unknown', () => {
      const error = new Error('Something went wrong');

      errorHandler.handleError(error);

      expect(notificationServiceSpy.show).toHaveBeenCalledWith(
        'An unexpected error occurred.',
        'error',
        5000
      );
    });

    it('should handle null error', () => {
      errorHandler.handleError(null);

      expect(notificationServiceSpy.show).toHaveBeenCalledWith(
        'An unexpected error occurred.',
        'error',
        5000
      );
    });

    it('should handle undefined error', () => {
      errorHandler.handleError(undefined);

      expect(notificationServiceSpy.show).toHaveBeenCalledWith(
        'An unexpected error occurred.',
        'error',
        5000
      );
    });
  });

  describe('Error notification fallback', () => {
    it('should handle notification service failure gracefully', () => {
      notificationServiceSpy.show.and.throwError('Notification failed');
      const error = new Error('Test error');

      // Error is logged via LoggerService (silenced in tests), but should not throw
      expect(() => errorHandler.handleError(error)).not.toThrow();
    });

    it('should handle both reporter and notification failure gracefully', () => {
      // Simulates total pipeline failure: reporter throws, then notification also throws
      const consoleErrorSpy = spyOn(console, 'error');
      errorReporterSpy.captureError.and.throwError('Reporter failed');
      notificationServiceSpy.show.and.throwError('Notification failed');
      const error = new Error('Test error');

      expect(() => errorHandler.handleError(error)).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Error reporting via token', () => {
    it('should report errors via ERROR_REPORTER token', () => {
      const error = new Error('Test error');
      errorHandler.handleError(error);

      expect(errorReporterSpy.captureError).toHaveBeenCalledTimes(1);
      const report = errorReporterSpy.captureError.calls.mostRecent().args[0];
      expect(report.error).toBe(error);
      expect(report.type).toBe('Unknown');
      expect(report.technicalMessage).toBe('Test error');
      expect(report.timestamp).toBeDefined();
    });

    it('should handle missing ERROR_REPORTER gracefully and still notify user', () => {
      // Simulate captureError throwing (e.g. no provider / broken reporter)
      errorReporterSpy.captureError.and.throwError('No provider for ERROR_REPORTER');
      const consoleErrorSpy = spyOn(console, 'error');

      const error = new Error('Test error');
      expect(() => errorHandler.handleError(error)).not.toThrow();
      expect(notificationServiceSpy.show).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Error logging', () => {
    it('should call handleError without throwing', () => {
      const error = new Error('Test error');
      expect(() => errorHandler.handleError(error)).not.toThrow();
    });

    it('should handle string errors', () => {
      const error = 'String error message';
      expect(() => errorHandler.handleError(error)).not.toThrow();
      expect(notificationServiceSpy.show).toHaveBeenCalledWith(
        'An unexpected error occurred.',
        'error',
        5000
      );
    });
  });

  describe('IndexedDB errors – IDB abbreviation', () => {
    it('should categorize error with "IDB" in message as IndexedDB error', () => {
      const error = new Error('IDB transaction aborted');

      errorHandler.handleError(error);

      expect(notificationServiceSpy.show).toHaveBeenCalledWith(
        'Failed to save data locally. Please check storage permissions.',
        'error',
        7000
      );
    });

    it('should categorize error-like plain object with QuotaExceededError name as IndexedDB', () => {
      // Exercises the isErrorLike second branch: isObject && 'message' in obj && 'name' in obj
      const error = { message: 'Storage quota exceeded', name: 'QuotaExceededError' };

      errorHandler.handleError(error);

      expect(notificationServiceSpy.show).toHaveBeenCalledWith(
        'Failed to save data locally. Please check storage permissions.',
        'error',
        7000
      );
    });
  });

  describe('Google API errors – negative boundary', () => {
    it('should NOT categorize error with result.error.code as string as GoogleAPI', () => {
      // code must be a number; a string code must fall through to Unknown
      const error = { result: { error: { code: '401' } }, message: 'Unauthorized' };

      errorHandler.handleError(error);

      expect(notificationServiceSpy.show).toHaveBeenCalledWith(
        'An unexpected error occurred.',
        'error',
        5000
      );
    });
  });

  describe('getErrorMessage – unknown-error fallback', () => {
    it('should use "Unknown error" as technical message for numeric errors', () => {
      errorHandler.handleError(42);

      const report = errorReporterSpy.captureError.calls.mostRecent().args[0];
      expect(report.technicalMessage).toBe('Unknown error');
    });

    it('should use "Unknown error" as technical message for boolean errors', () => {
      errorHandler.handleError(false);

      const report = errorReporterSpy.captureError.calls.mostRecent().args[0];
      expect(report.technicalMessage).toBe('Unknown error');
    });
  });

  describe('reportError – captureError failure recovery', () => {
    it('should not throw and still notify user if captureError itself throws', () => {
      const consoleErrorSpy = spyOn(console, 'error');
      errorReporterSpy.captureError.and.throwError('Reporting pipeline failed');
      const error = new Error('Test error');

      expect(() => errorHandler.handleError(error)).not.toThrow();
      expect(notificationServiceSpy.show).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
    });

    it('should log both reporter failure and original error to console.error', () => {
      const reporterFailure = new Error('Reporting pipeline failed');
      errorReporterSpy.captureError.and.throwError(reporterFailure.message);
      const originalError = new Error('Original error');

      const consoleErrorSpy = spyOn(console, 'error');
      errorHandler.handleError(originalError);

      // Two console.error calls: one for the reporter failure, one for the original error
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      const [firstCall, secondCall] = consoleErrorSpy.calls.allArgs();
      expect(firstCall[0]).toContain('[GlobalErrorHandler]');
      expect(firstCall[0]).toContain('reporter failed');
      expect(secondCall[0]).toContain('[GlobalErrorHandler]');
      expect(secondCall[1]).toBe(originalError);
    });

    it('should emit console.error with original error even when reporter throws', () => {
      errorReporterSpy.captureError.and.throwError('No provider for ERROR_REPORTER');
      const originalError = new Error('Original error');

      const consoleErrorSpy = spyOn(console, 'error');
      errorHandler.handleError(originalError);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      const secondCall = consoleErrorSpy.calls.allArgs()[1];
      expect(secondCall[1]).toBe(originalError);
    });
  });

  describe('Error reporting – type accuracy per category', () => {
    it('should report IndexedDB type to error reporter', () => {
      const error = new Error('Storage quota exceeded');
      error.name = 'QuotaExceededError';

      errorHandler.handleError(error);

      const report = errorReporterSpy.captureError.calls.mostRecent().args[0];
      expect(report.type).toBe('IndexedDB');
    });

    it('should report GoogleAPI type to error reporter', () => {
      const error = new Error('gapi is not defined');

      errorHandler.handleError(error);

      const report = errorReporterSpy.captureError.calls.mostRecent().args[0];
      expect(report.type).toBe('GoogleAPI');
    });

    it('should report Network type to error reporter', () => {
      const error = new TypeError('Failed to fetch');

      errorHandler.handleError(error);

      const report = errorReporterSpy.captureError.calls.mostRecent().args[0];
      expect(report.type).toBe('Network');
    });

    it('should report NgRx type to error reporter', () => {
      const error = new Error('Effect dispatched an invalid action');

      errorHandler.handleError(error);

      const report = errorReporterSpy.captureError.calls.mostRecent().args[0];
      expect(report.type).toBe('NgRx');
    });
  });
});
