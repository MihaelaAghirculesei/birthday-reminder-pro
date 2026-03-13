import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { NetworkService } from './network.service';
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
          { provide: PLATFORM_ID, useValue: 'browser' }
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
          { provide: PLATFORM_ID, useValue: 'server' }
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
});