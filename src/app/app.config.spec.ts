import { type SwUpdate, type UnrecoverableStateEvent } from '@angular/service-worker';
import { NEVER, type Observable,Subject } from 'rxjs';

import { initSwErrorLogging } from './app.config';
import { type LoggerService } from './core/services/logger.service';

function makeSwUpdate(unrecoverable: Observable<UnrecoverableStateEvent>): SwUpdate {
  return { unrecoverable } as unknown as SwUpdate;
}

describe('initSwErrorLogging', () => {
  let logger: jasmine.SpyObj<LoggerService>;
  let unrecoverableSubject: Subject<UnrecoverableStateEvent>;

  beforeEach(() => {
    logger = jasmine.createSpyObj<LoggerService>('LoggerService', ['error']);
    unrecoverableSubject = new Subject<UnrecoverableStateEvent>();
  });

  afterEach(() => {
    unrecoverableSubject.complete();
  });

  describe('unrecoverable state', () => {
    it('should log when SW enters an unrecoverable state', () => {
      const swUpdate = makeSwUpdate(unrecoverableSubject.asObservable());
      const fn = initSwErrorLogging(swUpdate, logger, {} as object);
      fn();

      unrecoverableSubject.next({ type: 'UNRECOVERABLE_STATE', reason: 'hash mismatch' } as UnrecoverableStateEvent);

      expect(logger.error).toHaveBeenCalledWith(
        '[SW] Unrecoverable state — reload required:',
        'hash mismatch'
      );
    });

    it('should log each unrecoverable event independently', () => {
      const swUpdate = makeSwUpdate(unrecoverableSubject.asObservable());
      const fn = initSwErrorLogging(swUpdate, logger, {} as object);
      fn();

      unrecoverableSubject.next({ type: 'UNRECOVERABLE_STATE', reason: 'first error' } as UnrecoverableStateEvent);
      unrecoverableSubject.next({ type: 'UNRECOVERABLE_STATE', reason: 'second error' } as UnrecoverableStateEvent);

      expect(logger.error).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenCalledWith('[SW] Unrecoverable state — reload required:', 'first error');
      expect(logger.error).toHaveBeenCalledWith('[SW] Unrecoverable state — reload required:', 'second error');
    });
  });

  describe('registration failure — browser platform', () => {
    let originalServiceWorker: ServiceWorkerContainer | undefined;

    beforeEach(() => {
      originalServiceWorker = (navigator as Navigator & { serviceWorker?: ServiceWorkerContainer }).serviceWorker;
    });

    afterEach(() => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: originalServiceWorker,
        configurable: true,
        writable: true
      });
    });

    it('should log registration failures', async () => {
      const registrationError = new Error('SW script not found');
      const swMock = {
        register: jasmine.createSpy('register').and.returnValue(Promise.reject(registrationError))
      };
      Object.defineProperty(navigator, 'serviceWorker', {
        value: swMock,
        configurable: true,
        writable: true
      });

      // 'browser' platform token value from @angular/common
      const browserPlatformId = 'browser' as unknown as object;
      const fn = initSwErrorLogging(makeSwUpdate(NEVER), logger, browserPlatformId, false);
      fn();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(logger.error).toHaveBeenCalledWith('[SW] Registration failed:', registrationError);
    });

    it('should not log when registration succeeds', async () => {
      const swMock = {
        register: jasmine.createSpy('register').and.returnValue(Promise.resolve({} as ServiceWorkerRegistration))
      };
      Object.defineProperty(navigator, 'serviceWorker', {
        value: swMock,
        configurable: true,
        writable: true
      });

      const browserPlatformId = 'browser' as unknown as object;
      const fn = initSwErrorLogging(makeSwUpdate(NEVER), logger, browserPlatformId, false);
      fn();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  describe('non-browser platform (SSR)', () => {
    it('should not attempt SW registration on server platform', () => {
      const serverPlatformId = 'server' as unknown as object;
      const fn = initSwErrorLogging(makeSwUpdate(NEVER), logger, serverPlatformId);
      expect(() => fn()).not.toThrow();
      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  describe('browser without SW support', () => {
    let originalServiceWorker: ServiceWorkerContainer | undefined;

    beforeEach(() => {
      originalServiceWorker = (navigator as Navigator & { serviceWorker?: ServiceWorkerContainer }).serviceWorker;
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        configurable: true,
        writable: true
      });
    });

    afterEach(() => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: originalServiceWorker,
        configurable: true,
        writable: true
      });
    });

    it('should skip SW registration when serviceWorker is not supported', () => {
      const browserPlatformId = 'browser' as unknown as object;
      const fn = initSwErrorLogging(makeSwUpdate(NEVER), logger, browserPlatformId, false);
      expect(() => fn()).not.toThrow();
      expect(logger.error).not.toHaveBeenCalled();
    });
  });
});
