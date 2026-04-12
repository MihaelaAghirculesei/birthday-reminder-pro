import { TestBed, fakeAsync, tick, flushMicrotasks, discardPeriodicTasks } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { NetworkService } from './network.service';
import { provideTranslateTesting } from '../../testing/translate-testing';
import { Subscription } from 'rxjs';

describe('NetworkService', () => {
  let service: NetworkService;
  let subscription: Subscription;

  afterEach(() => {
    if (subscription) {
      subscription.unsubscribe();
    }
  });

  describe('Browser environment', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          NetworkService,
          { provide: PLATFORM_ID, useValue: 'browser' },
          provideTranslateTesting()
        ]
      });
      service = TestBed.inject(NetworkService);
    });

    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with navigator.onLine status', () => {
      expect(service.isOnline).toBe(navigator.onLine);
    });

    it('should have online$ observable', (done) => {
      subscription = service.online$.subscribe(online => {
        expect(typeof online).toBe('boolean');
        done();
      });
    });

    it('should return correct isOffline value', () => {
      expect(service.isOffline).toBe(!navigator.onLine);
    });

    it('should update online status when navigator.onLine changes', (done) => {
      let callCount = 0;
      subscription = service.online$.subscribe(online => {
        callCount++;
        if (callCount === 1) {
          expect(online).toBe(navigator.onLine);
        }
        if (callCount === 2) {
          expect(typeof online).toBe('boolean');
          done();
        }
      });

      const onlineEvent = new Event('online');
      window.dispatchEvent(onlineEvent);
    });

    it('should respond to offline event', (done) => {
      let callCount = 0;
      subscription = service.online$.subscribe(online => {
        callCount++;
        if (callCount === 2) {
          expect(online).toBe(false);
          done();
        }
      });

      const offlineEvent = new Event('offline');
      window.dispatchEvent(offlineEvent);
    });

    it('should respond to online event', (done) => {
      let callCount = 0;
      subscription = service.online$.subscribe(online => {
        callCount++;
        if (callCount === 2) {
          expect(online).toBe(true);
          done();
        }
      });

      const onlineEvent = new Event('online');
      window.dispatchEvent(onlineEvent);
    });
  });

  describe('Server environment', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          NetworkService,
          { provide: PLATFORM_ID, useValue: 'server' },
          provideTranslateTesting()
        ]
      });
      service = TestBed.inject(NetworkService);
    });

    it('should be created on server', () => {
      expect(service).toBeTruthy();
    });

    it('should return true for isOnline on server', () => {
      expect(service.isOnline).toBe(true);
    });

    it('should return false for isOffline on server', () => {
      expect(service.isOffline).toBe(false);
    });

    it('should have online$ observable on server', (done) => {
      subscription = service.online$.subscribe(online => {
        expect(online).toBe(true);
        done();
      });
    });
  });

  describe('Health check', () => {
    type TestableService = NetworkService & { performHealthCheck(): Promise<boolean> };
    let fetchSpy: jasmine.Spy;

    beforeEach(() => {
      fetchSpy = spyOn(globalThis, 'fetch').and.returnValue(
        Promise.resolve(new Response(null, { status: 200 }))
      );
      TestBed.configureTestingModule({
        providers: [
          NetworkService,
          { provide: PLATFORM_ID, useValue: 'browser' },
          provideTranslateTesting()
        ]
      });
    });

    it('performHealthCheck resolves true when server responds 200', async () => {
      service = TestBed.inject(NetworkService);
      const result = await (service as TestableService).performHealthCheck();
      expect(result).toBe(true);
      expect(fetchSpy).toHaveBeenCalledWith('/favicon.ico?ngsw-bypass', jasmine.objectContaining({
        method: 'HEAD',
        cache: 'no-store'
      }));
    });

    it('performHealthCheck resolves false when server responds non-ok', async () => {
      fetchSpy.and.returnValue(Promise.resolve(new Response(null, { status: 503 })));
      service = TestBed.inject(NetworkService);
      const result = await (service as TestableService).performHealthCheck();
      expect(result).toBe(false);
    });

    it('performHealthCheck resolves false when fetch rejects', async () => {
      fetchSpy.and.returnValue(Promise.reject(new TypeError('Failed to fetch')));
      service = TestBed.inject(NetworkService);
      const result = await (service as TestableService).performHealthCheck();
      expect(result).toBe(false);
    });

    it('should mark offline when periodic health check fails', fakeAsync(() => {
      service = TestBed.inject(NetworkService);
      spyOn(service as TestableService, 'performHealthCheck').and.returnValue(Promise.resolve(false));

      tick(30_000);
      flushMicrotasks();
      flushMicrotasks();

      expect(service.isOnline).toBe(false);
      discardPeriodicTasks();
    }));

    it('should remain online when periodic health check succeeds', fakeAsync(() => {
      service = TestBed.inject(NetworkService);
      spyOn(service as TestableService, 'performHealthCheck').and.returnValue(Promise.resolve(true));

      tick(30_000);
      flushMicrotasks();
      flushMicrotasks();

      expect(service.isOnline).toBe(true);
      discardPeriodicTasks();
    }));

    it('should recover to online after health check succeeds following failure', fakeAsync(() => {
      service = TestBed.inject(NetworkService);
      const healthCheckSpy = spyOn(service as TestableService, 'performHealthCheck').and.returnValue(Promise.resolve(false));

      tick(30_000);
      flushMicrotasks();
      flushMicrotasks();
      expect(service.isOnline).toBe(false);

      healthCheckSpy.and.returnValue(Promise.resolve(true));
      tick(30_000);
      flushMicrotasks();
      flushMicrotasks();
      expect(service.isOnline).toBe(true);

      discardPeriodicTasks();
    }));

    it('should not emit when health check confirms current online state', fakeAsync(() => {
      service = TestBed.inject(NetworkService);
      spyOn(service as TestableService, 'performHealthCheck').and.returnValue(Promise.resolve(true));
      let emitCount = 0;
      subscription = service.online$.subscribe(() => emitCount++);
      const initial = emitCount;

      tick(30_000);
      flushMicrotasks();
      flushMicrotasks();

      expect(emitCount).toBe(initial);
      discardPeriodicTasks();
    }));

    it('performHealthCheck resolves false when abort timeout fires', fakeAsync(() => {
      fetchSpy.and.callFake((_url: string, options?: RequestInit) =>
        new Promise<Response>((_, reject) => {
          options?.signal?.addEventListener('abort', () =>
            reject(new DOMException('The user aborted a request.', 'AbortError'))
          );
          // intentionally never resolves — simulates a hanging server
        })
      );
      service = TestBed.inject(NetworkService);

      let result: boolean | undefined;
      (service as TestableService).performHealthCheck().then((val: boolean) => { result = val; });

      tick(5_000);       // fires setTimeout → controller.abort()
      flushMicrotasks(); // .then error callback: clearTimeout + return false
      flushMicrotasks(); // outer .then: result = false

      expect(result).toBe(false);
    }));

    it('should not call fetch in server environment', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          NetworkService,
          { provide: PLATFORM_ID, useValue: 'server' },
          provideTranslateTesting()
        ]
      });
      service = TestBed.inject(NetworkService);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});