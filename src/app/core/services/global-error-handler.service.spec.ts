import { TestBed } from '@angular/core/testing';
import { Injector } from '@angular/core';
import { GlobalErrorHandler } from './global-error-handler.service';
import { NotificationService } from './notification.service';
import { SILENT_LOGGER_PROVIDER } from './logger.service';

describe('GlobalErrorHandler', () => {
  let errorHandler: GlobalErrorHandler;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
  let injectorSpy: jasmine.SpyObj<Injector>;

  beforeEach(() => {
    notificationServiceSpy = jasmine.createSpyObj('NotificationService', ['show']);
    injectorSpy = jasmine.createSpyObj('Injector', ['get']);
    injectorSpy.get.and.returnValue(notificationServiceSpy);

    TestBed.configureTestingModule({
      providers: [
        { provide: Injector, useValue: injectorSpy },
        GlobalErrorHandler,
        SILENT_LOGGER_PROVIDER
      ]
    });

    errorHandler = TestBed.inject(GlobalErrorHandler);
    // Note: console spies are set up globally in test-setup.ts
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

    it('should handle injector failure gracefully', () => {
      injectorSpy.get.and.throwError('Injector failed');
      const error = new Error('Test error');

      expect(() => errorHandler.handleError(error)).not.toThrow();
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
});
