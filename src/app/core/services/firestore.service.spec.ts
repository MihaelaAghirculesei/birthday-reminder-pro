import { TestBed } from '@angular/core/testing';

import * as firebaseConfig from '../../firebase.config';
import { FIREBASE_OPTIONS } from '../../firebase.config';
import { type Birthday, type Category } from '../../shared/models/birthday.model';
import { provideTranslateTesting } from '../../testing/translate-testing';
import { FirestoreService } from './firestore.service';
import { LoggerService } from './logger.service';
import { PhotoStorageService } from './photo-storage.service';

function makePhotoStorageMock(): jasmine.SpyObj<PhotoStorageService> {
  const mock = jasmine.createSpyObj<PhotoStorageService>('PhotoStorageService', [
    'isStorageUrl', 'isBase64', 'extractPath', 'resolveUrl',
  ]);
  mock.isStorageUrl.and.returnValue(false);
  mock.isBase64.and.returnValue(false);
  mock.extractPath.and.returnValue(null);
  mock.resolveUrl.and.resolveTo(null);
  return mock;
}

describe('FirestoreService', () => {
  describe('basic tests', () => {
    let service: FirestoreService;
    let loggerMock: jasmine.SpyObj<LoggerService>;

    beforeEach(() => {
      loggerMock = jasmine.createSpyObj('LoggerService', ['log', 'info', 'warn', 'error']);

      TestBed.configureTestingModule({
        providers: [
          { provide: LoggerService, useValue: loggerMock },
          { provide: PhotoStorageService, useValue: makePhotoStorageMock() },
          { provide: FIREBASE_OPTIONS, useValue: undefined },
          provideTranslateTesting()
        ]
      });

      service = TestBed.inject(FirestoreService);
    });

    it('should create', () => {
      expect(service).toBeTruthy();
    });

    it('birthdays$ should be an observable', () => {
      expect(service.birthdays$).toBeTruthy();
      expect(service.birthdays$.subscribe).toBeDefined();
    });

    it('birthdays$ emits [] immediately on subscribe — BehaviorSubject prevents race condition', (done) => {
      service.birthdays$.subscribe((value) => {
        expect(value).toEqual([]);
        done();
      });
    });

    it('birthdays$ replays last value to a late subscriber — no first-snapshot loss', (done) => {
      const earlyBirthday = { id: 'b-early', name: 'Early', birthDate: '2000-01-01' } as Birthday;
      (service as unknown as { birthdaysSubject: { next: (v: Birthday[]) => void } })
        .birthdaysSubject.next([earlyBirthday]);

      // Subscribe AFTER the emission — BehaviorSubject guarantees delivery
      service.birthdays$.subscribe((value) => {
        expect(value).toEqual([earlyBirthday]);
        done();
      });
    });

    it('categories$ should be an observable', () => {
      expect(service.categories$).toBeTruthy();
      expect(service.categories$.subscribe).toBeDefined();
    });

    it('categories$ emits [] immediately on subscribe — BehaviorSubject prevents race condition', (done) => {
      service.categories$.subscribe((value) => {
        expect(value).toEqual([]);
        done();
      });
    });

    it('unsubscribeFromBirthdays should not throw when no listener', () => {
      expect(() => service.unsubscribeFromBirthdays()).not.toThrow();
    });

    it('unsubscribeFromCategories should not throw when no listener', () => {
      expect(() => service.unsubscribeFromCategories()).not.toThrow();
    });

    it('unsubscribeAll should not throw when no listeners', () => {
      expect(() => service.unsubscribeAll()).not.toThrow();
    });

    it('getBirthdays should return an observable', () => {
      const result = service.getBirthdays('user-123');
      expect(result).toBeTruthy();
      expect(result.subscribe).toBeDefined();
    });

    it('getCategories should return an observable', () => {
      const result = service.getCategories('user-123');
      expect(result).toBeTruthy();
      expect(result.subscribe).toBeDefined();
    });

    it('saveBirthday should return an observable', () => {
      const birthday = { id: '1', name: 'Test', birthDate: '2000-01-01' } as Birthday;
      const result = service.saveBirthday('user-123', birthday);
      expect(result).toBeTruthy();
      expect(result.subscribe).toBeDefined();
    });

    it('deleteBirthday should return an observable', () => {
      const result = service.deleteBirthday('user-123', 'b-1');
      expect(result).toBeTruthy();
      expect(result.subscribe).toBeDefined();
    });

    it('saveCategory should return an observable', () => {
      const category = { id: '1', name: 'Test', icon: 'star', color: '#000' } as Category;
      const result = service.saveCategory('user-123', category);
      expect(result).toBeTruthy();
      expect(result.subscribe).toBeDefined();
    });

    it('deleteCategory should return an observable', () => {
      const result = service.deleteCategory('user-123', 'c-1');
      expect(result).toBeTruthy();
      expect(result.subscribe).toBeDefined();
    });

    it('saveBirthdaysBatch should return an observable', () => {
      const result = service.saveBirthdaysBatch('user-123', []);
      expect(result).toBeTruthy();
      expect(result.subscribe).toBeDefined();
    });

    it('subscribeToBirthdays should not throw', () => {
      expect(() => service.subscribeToBirthdays('user-123')).not.toThrow();
    });

    it('subscribeToCategories should not throw', () => {
      expect(() => service.subscribeToCategories('user-123')).not.toThrow();
    });
  });

  describe('error branches', () => {
    // Use a non-retryable error code (permission-denied is not in RETRYABLE_CODES)
    // so these tests verify immediate log+rethrow without triggering retry loops.
    const networkError = Object.assign(new Error('Permission denied'), { code: 'permission-denied' });
    const VALID_OPTIONS = { apiKey: 'test-api-key', projectId: 'test-project' };

    let service: FirestoreService;
    let loggerMock: jasmine.SpyObj<LoggerService>;
    let mockBatch: { set: jasmine.Spy; delete: jasmine.Spy; commit: jasmine.Spy };

    beforeEach(() => {
      loggerMock = jasmine.createSpyObj('LoggerService', ['log', 'info', 'warn', 'error']);

      TestBed.configureTestingModule({
        providers: [
          { provide: LoggerService, useValue: loggerMock },
          { provide: PhotoStorageService, useValue: makePhotoStorageMock() },
          { provide: FIREBASE_OPTIONS, useValue: VALID_OPTIONS },
          provideTranslateTesting()
        ]
      });

      service = TestBed.inject(FirestoreService);
      // Disable real delays (non-retryable errors don't trigger delays anyway,
      // but guard against accidental retries slowing down the suite).
      spyOn(service as unknown as { delayMs: (ms: number) => Promise<void> }, 'delayMs')
        .and.returnValue(Promise.resolve());

      mockBatch = {
        set: jasmine.createSpy('batch.set'),
        delete: jasmine.createSpy('batch.delete'),
        commit: jasmine.createSpy('batch.commit').and.rejectWith(networkError),
      };

      // firebaseGetters is a plain object, so its properties are writable —
      // no Object.defineProperty tricks needed. spyOn works out of the box.
      spyOn(firebaseConfig.firebaseGetters, 'getFirebaseFirestore').and.returnValue(
        {} as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirebaseFirestore>
      );
    });

    it('getBirthdays should log and rethrow on getDocs failure', (done) => {
      spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').and.returnValue({
        collection: jasmine.createSpy().and.returnValue({}),
        getDocs: jasmine.createSpy().and.rejectWith(networkError),
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      service.getBirthdays('user-123').subscribe({
        error: (err) => {
          expect(err).toBe(networkError);
          expect(loggerMock.error).toHaveBeenCalledWith('[Firestore] Failed to fetch birthdays:', networkError);
          done();
        }
      });
    });

    it('getCategories should log and rethrow on getDocs failure', (done) => {
      spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').and.returnValue({
        collection: jasmine.createSpy().and.returnValue({}),
        getDocs: jasmine.createSpy().and.rejectWith(networkError),
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      service.getCategories('user-123').subscribe({
        error: (err) => {
          expect(err).toBe(networkError);
          expect(loggerMock.error).toHaveBeenCalledWith('[Firestore] Failed to fetch categories:', networkError);
          done();
        }
      });
    });

    it('saveBirthday should log and rethrow on commit failure', (done) => {
      spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').and.returnValue({
        writeBatch: jasmine.createSpy().and.returnValue(mockBatch),
        doc: jasmine.createSpy().and.returnValue({}),
        serverTimestamp: jasmine.createSpy().and.returnValue({}),
        Timestamp: { fromDate: jasmine.createSpy().and.returnValue({}) },
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      const birthday = { id: 'b-1', name: 'Test', birthDate: '2000-01-01', syncStatus: 'local-only' } as Birthday;
      service.saveBirthday('user-123', birthday).subscribe({
        error: (err) => {
          expect(err).toBe(networkError);
          expect(loggerMock.error).toHaveBeenCalledWith('[Firestore] Failed to save birthday:', networkError);
          done();
        }
      });
    });

    it('deleteBirthday should log and rethrow on commit failure', (done) => {
      spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').and.returnValue({
        writeBatch: jasmine.createSpy().and.returnValue(mockBatch),
        doc: jasmine.createSpy().and.returnValue({}),
        serverTimestamp: jasmine.createSpy().and.returnValue({}),
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      service.deleteBirthday('user-123', 'b-1').subscribe({
        error: (err) => {
          expect(err).toBe(networkError);
          expect(loggerMock.error).toHaveBeenCalledWith('[Firestore] Failed to delete birthday:', networkError);
          done();
        }
      });
    });

    it('saveBirthdaysBatch should log and rethrow on commit failure', (done) => {
      spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').and.returnValue({
        writeBatch: jasmine.createSpy().and.returnValue(mockBatch),
        doc: jasmine.createSpy().and.returnValue({}),
        serverTimestamp: jasmine.createSpy().and.returnValue({}),
        Timestamp: { fromDate: jasmine.createSpy().and.returnValue({}) },
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      const birthday = { id: 'b-1', name: 'Test', birthDate: '2000-01-01', syncStatus: 'local-only' } as Birthday;
      service.saveBirthdaysBatch('user-123', [birthday]).subscribe({
        error: (err) => {
          expect(err).toBe(networkError);
          expect(loggerMock.error).toHaveBeenCalledWith('[Firestore] Batch save failed:', networkError);
          done();
        }
      });
    });

    it('saveCategory should log and rethrow on commit failure', (done) => {
      spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').and.returnValue({
        writeBatch: jasmine.createSpy().and.returnValue(mockBatch),
        doc: jasmine.createSpy().and.returnValue({}),
        serverTimestamp: jasmine.createSpy().and.returnValue({}),
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      const category = { id: 'c-1', name: 'Test', icon: 'star', color: '#000' } as Category;
      service.saveCategory('user-123', category).subscribe({
        error: (err) => {
          expect(err).toBe(networkError);
          expect(loggerMock.error).toHaveBeenCalledWith('[Firestore] Failed to save category:', networkError);
          done();
        }
      });
    });

    it('deleteCategory should log and rethrow on commit failure', (done) => {
      spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').and.returnValue({
        writeBatch: jasmine.createSpy().and.returnValue(mockBatch),
        doc: jasmine.createSpy().and.returnValue({}),
        serverTimestamp: jasmine.createSpy().and.returnValue({}),
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      service.deleteCategory('user-123', 'c-1').subscribe({
        error: (err) => {
          expect(err).toBe(networkError);
          expect(loggerMock.error).toHaveBeenCalledWith('[Firestore] Failed to delete category:', networkError);
          done();
        }
      });
    });
  });

  describe('private mapper helpers', () => {
    const VALID_OPTIONS = { apiKey: 'test-api-key', projectId: 'test-project' };
    let service: FirestoreService;

    interface InspectableService {
      mapTimestamp: (v: unknown) => number | unknown;
      stripNulls: <T>(obj: Record<string, T>) => Record<string, T>;
    }

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          { provide: LoggerService, useValue: jasmine.createSpyObj('LoggerService', ['log', 'info', 'warn', 'error']) },
          { provide: PhotoStorageService, useValue: makePhotoStorageMock() },
          { provide: FIREBASE_OPTIONS, useValue: VALID_OPTIONS },
          provideTranslateTesting()
        ]
      });
      service = TestBed.inject(FirestoreService);
    });

    describe('mapTimestamp', () => {
      it('converts a Timestamp-like object (has toMillis) to its millis value', () => {
        const ts = { toMillis: () => 1700000000000 };
        const result = (service as unknown as InspectableService).mapTimestamp(ts);
        expect(result).toBe(1700000000000);
      });

      it('returns string values unchanged', () => {
        expect((service as unknown as InspectableService).mapTimestamp('hello')).toBe('hello');
      });

      it('returns numeric values unchanged', () => {
        expect((service as unknown as InspectableService).mapTimestamp(42)).toBe(42);
      });

      it('returns null unchanged', () => {
        expect((service as unknown as InspectableService).mapTimestamp(null)).toBeNull();
      });

      it('returns undefined unchanged', () => {
        expect((service as unknown as InspectableService).mapTimestamp(undefined)).toBeUndefined();
      });

      it('returns plain objects without toMillis unchanged', () => {
        const obj = { foo: 'bar' };
        expect((service as unknown as InspectableService).mapTimestamp(obj)).toBe(obj);
      });
    });

    describe('stripNulls', () => {
      it('removes null-valued entries and keeps the rest', () => {
        const input = { a: 'keep', b: null, c: 42, d: null } as Record<string, unknown>;
        expect((service as unknown as InspectableService).stripNulls(input))
          .toEqual({ a: 'keep', c: 42 });
      });

      it('returns empty object when all values are null', () => {
        const input = { x: null, y: null } as Record<string, unknown>;
        expect((service as unknown as InspectableService).stripNulls(input)).toEqual({});
      });

      it('returns all entries unchanged when no nulls are present', () => {
        const input = { a: 1, b: 'two', c: false } as Record<string, unknown>;
        expect((service as unknown as InspectableService).stripNulls(input))
          .toEqual({ a: 1, b: 'two', c: false });
      });

      it('keeps undefined and 0 and empty-string — only null is stripped', () => {
        const input = { a: undefined, b: 0, c: '', d: null } as Record<string, unknown>;
        expect((service as unknown as InspectableService).stripNulls(input))
          .toEqual({ a: undefined, b: 0, c: '' });
      });
    });
  });

  describe('retry behavior', () => {
    const retryableError = Object.assign(new Error('Service unavailable'), { code: 'unavailable' });
    const VALID_OPTIONS = { apiKey: 'test-api-key', projectId: 'test-project' };

    let service: FirestoreService;
    let loggerMock: jasmine.SpyObj<LoggerService>;

    interface DelayableService {
      delayMs: (ms: number) => Promise<void>;
      jitterMs: () => number;
    }
    interface InspectableService {
      isRetryable: (e: unknown) => boolean;
      isRateLimited: (e: unknown) => boolean;
    }

    beforeEach(() => {
      loggerMock = jasmine.createSpyObj('LoggerService', ['log', 'info', 'warn', 'error']);

      TestBed.configureTestingModule({
        providers: [
          { provide: LoggerService, useValue: loggerMock },
          { provide: PhotoStorageService, useValue: makePhotoStorageMock() },
          { provide: FIREBASE_OPTIONS, useValue: VALID_OPTIONS },
          provideTranslateTesting()
        ]
      });

      service = TestBed.inject(FirestoreService);
      // Replace delay with a no-op so retry tests complete without real waits
      spyOn(service as unknown as DelayableService, 'delayMs').and.returnValue(Promise.resolve());
      spyOn(service as unknown as DelayableService, 'jitterMs').and.returnValue(0);

      spyOn(firebaseConfig.firebaseGetters, 'getFirebaseFirestore').and.returnValue(
        {} as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirebaseFirestore>
      );
    });

    it('isRetryable returns true for "unavailable"', () => {
      const err = Object.assign(new Error(), { code: 'unavailable' });
      expect((service as unknown as InspectableService).isRetryable(err)).toBeTrue();
    });

    it('isRetryable returns true for namespaced "firestore/unavailable"', () => {
      const err = Object.assign(new Error(), { code: 'firestore/unavailable' });
      expect((service as unknown as InspectableService).isRetryable(err)).toBeTrue();
    });

    it('isRetryable returns true for "deadline-exceeded" and "internal"', () => {
      const fn = (service as unknown as InspectableService).isRetryable.bind(service);
      expect(fn(Object.assign(new Error(), { code: 'deadline-exceeded' }))).toBeTrue();
      expect(fn(Object.assign(new Error(), { code: 'internal' }))).toBeTrue();
    });

    it('isRetryable returns false for non-retryable Firebase codes', () => {
      const fn = (service as unknown as InspectableService).isRetryable.bind(service);
      expect(fn(Object.assign(new Error(), { code: 'permission-denied' }))).toBeFalse();
      expect(fn(Object.assign(new Error(), { code: 'not-found' }))).toBeFalse();
      expect(fn(Object.assign(new Error(), { code: 'unauthenticated' }))).toBeFalse();
    });

    it('isRetryable returns false for errors without a code property', () => {
      const fn = (service as unknown as InspectableService).isRetryable.bind(service);
      expect(fn(new Error('plain error'))).toBeFalse();
      expect(fn('string error')).toBeFalse();
      expect(fn(null)).toBeFalse();
      expect(fn(42)).toBeFalse();
    });

    it('saveBirthday retries once on retryable error and succeeds', (done) => {
      let callCount = 0;
      const mockBatch = {
        set: jasmine.createSpy(),
        commit: jasmine.createSpy().and.callFake(() =>
          ++callCount === 1 ? Promise.reject(retryableError) : Promise.resolve()
        )
      };
      spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').and.returnValue({
        writeBatch: jasmine.createSpy().and.returnValue(mockBatch),
        doc: jasmine.createSpy().and.returnValue({}),
        serverTimestamp: jasmine.createSpy().and.returnValue({}),
        Timestamp: { fromDate: jasmine.createSpy().and.returnValue({}) },
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      const birthday = { id: 'b-retry', name: 'Test', birthDate: '2000-01-01', syncStatus: 'local-only' } as Birthday;
      service.saveBirthday('user-123', birthday).subscribe({
        complete: () => {
          expect(callCount).toBe(2);
          expect(loggerMock.warn).toHaveBeenCalled();
          expect(loggerMock.info).toHaveBeenCalledWith('[Firestore] Birthday saved:', 'b-retry');
          done();
        },
        error: done.fail
      });
    });

    it('saveBirthday exhausts retries (4 total attempts) and rethrows', (done) => {
      let callCount = 0;
      const mockBatch = {
        set: jasmine.createSpy(),
        commit: jasmine.createSpy().and.callFake(() => {
          callCount++;
          return Promise.reject(retryableError);
        })
      };
      spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').and.returnValue({
        writeBatch: jasmine.createSpy().and.returnValue(mockBatch),
        doc: jasmine.createSpy().and.returnValue({}),
        serverTimestamp: jasmine.createSpy().and.returnValue({}),
        Timestamp: { fromDate: jasmine.createSpy().and.returnValue({}) },
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      const birthday = { id: 'b-exhaust', name: 'Test', birthDate: '2000-01-01', syncStatus: 'local-only' } as Birthday;
      service.saveBirthday('user-123', birthday).subscribe({
        error: (err) => {
          expect(err).toBe(retryableError);
          expect(callCount).toBe(4); // 1 initial + 3 retries
          expect(loggerMock.error).toHaveBeenCalledWith('[Firestore] Failed to save birthday:', retryableError);
          done();
        }
      });
    });

    it('getBirthdays retries on retryable error and succeeds', (done) => {
      let callCount = 0;
      spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').and.returnValue({
        collection: jasmine.createSpy().and.returnValue({}),
        getDocs: jasmine.createSpy().and.callFake(() =>
          ++callCount === 1
            ? Promise.reject(retryableError)
            : Promise.resolve({ docs: [] })
        ),
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      service.getBirthdays('user-123').subscribe({
        next: (result) => {
          expect(result).toEqual([]);
          expect(callCount).toBe(2);
          done();
        },
        error: done.fail
      });
    });

    it('deleteCategory retries on retryable error and succeeds', (done) => {
      let callCount = 0;
      const mockBatch = {
        set: jasmine.createSpy(),
        delete: jasmine.createSpy(),
        commit: jasmine.createSpy().and.callFake(() =>
          ++callCount === 1 ? Promise.reject(retryableError) : Promise.resolve()
        )
      };
      spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').and.returnValue({
        writeBatch: jasmine.createSpy().and.returnValue(mockBatch),
        doc: jasmine.createSpy().and.returnValue({}),
        serverTimestamp: jasmine.createSpy().and.returnValue({}),
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      service.deleteCategory('user-123', 'c-retry').subscribe({
        complete: () => {
          expect(callCount).toBe(2);
          done();
        },
        error: done.fail
      });
    });

    // ── isRateLimited ─────────────────────────────────────────────────────────
    describe('isRateLimited', () => {
      it('returns true for "resource-exhausted"', () => {
        const err = Object.assign(new Error(), { code: 'resource-exhausted' });
        expect((service as unknown as InspectableService).isRateLimited(err)).toBeTrue();
      });

      it('returns true for namespaced "firestore/resource-exhausted"', () => {
        const err = Object.assign(new Error(), { code: 'firestore/resource-exhausted' });
        expect((service as unknown as InspectableService).isRateLimited(err)).toBeTrue();
      });

      it('returns false for other retryable codes', () => {
        const fn = (service as unknown as InspectableService).isRateLimited.bind(service);
        expect(fn(Object.assign(new Error(), { code: 'unavailable' }))).toBeFalse();
        expect(fn(Object.assign(new Error(), { code: 'internal' }))).toBeFalse();
      });

      it('returns false for errors without a code', () => {
        const fn = (service as unknown as InspectableService).isRateLimited.bind(service);
        expect(fn(new Error('plain'))).toBeFalse();
        expect(fn(null)).toBeFalse();
        expect(fn('string')).toBeFalse();
      });
    });

    // ── rate-limit backoff ────────────────────────────────────────────────────
    it('isRetryable returns true for "resource-exhausted"', () => {
      const err = Object.assign(new Error(), { code: 'resource-exhausted' });
      expect((service as unknown as InspectableService).isRetryable(err)).toBeTrue();
    });

    it('saveBirthday retries on resource-exhausted and uses longer base delay (1000 ms)', (done) => {
      const rateLimitError = Object.assign(new Error('Quota exceeded'), { code: 'resource-exhausted' });
      let callCount = 0;
      const mockBatch = {
        set: jasmine.createSpy(),
        commit: jasmine.createSpy().and.callFake(() =>
          ++callCount === 1 ? Promise.reject(rateLimitError) : Promise.resolve()
        )
      };
      spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').and.returnValue({
        writeBatch: jasmine.createSpy().and.returnValue(mockBatch),
        doc: jasmine.createSpy().and.returnValue({}),
        serverTimestamp: jasmine.createSpy().and.returnValue({}),
        Timestamp: { fromDate: jasmine.createSpy().and.returnValue({}) },
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      const delaySpy = (service as unknown as DelayableService).delayMs as jasmine.Spy;

      const birthday = { id: 'b-ratelimit', name: 'Test', birthDate: '2000-01-01', syncStatus: 'local-only' } as Birthday;
      service.saveBirthday('user-123', birthday).subscribe({
        complete: () => {
          expect(callCount).toBe(2);
          // jitterMs is spied to return 0, so delay = 1000 * 2^0 + 0 = 1000
          expect(delaySpy).toHaveBeenCalledWith(1000);
          done();
        },
        error: done.fail
      });
    });

    it('saveBirthday exhausts retries on resource-exhausted and rethrows', (done) => {
      const rateLimitError = Object.assign(new Error('Quota exceeded'), { code: 'resource-exhausted' });
      let callCount = 0;
      const mockBatch = {
        set: jasmine.createSpy(),
        commit: jasmine.createSpy().and.callFake(() => { callCount++; return Promise.reject(rateLimitError); })
      };
      spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').and.returnValue({
        writeBatch: jasmine.createSpy().and.returnValue(mockBatch),
        doc: jasmine.createSpy().and.returnValue({}),
        serverTimestamp: jasmine.createSpy().and.returnValue({}),
        Timestamp: { fromDate: jasmine.createSpy().and.returnValue({}) },
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      const birthday = { id: 'b-ratelimit-exhaust', name: 'Test', birthDate: '2000-01-01', syncStatus: 'local-only' } as Birthday;
      service.saveBirthday('user-123', birthday).subscribe({
        error: (err) => {
          expect(err).toBe(rateLimitError);
          expect(callCount).toBe(4); // 1 initial + 3 retries
          expect(loggerMock.error).toHaveBeenCalledWith('[Firestore] Failed to save birthday:', rateLimitError);
          done();
        }
      });
    });

    it('saveBirthday stores birthDate as YYYY-MM-DD string — no Timestamp to avoid timezone shift', (done) => {
      // Regression guard: birthDate must be stored as a plain string so that
      // reading it back in a different timezone cannot shift the date by ±1 day.
      // batch.set is called twice: once for the birthday, once for the rate-limit
      // sentinel — so we inspect the first call's arguments.
      const setSpy = jasmine.createSpy('batch.set');
      const successBatch = {
        set: setSpy,
        commit: jasmine.createSpy('batch.commit').and.resolveTo(undefined)
      };
      const timestampFromDateSpy = jasmine.createSpy('Timestamp.fromDate');
      spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').and.returnValue({
        writeBatch: jasmine.createSpy().and.returnValue(successBatch),
        doc: jasmine.createSpy().and.returnValue({}),
        serverTimestamp: jasmine.createSpy().and.returnValue({}),
        Timestamp: { fromDate: timestampFromDateSpy },
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      const birthday = { id: 'b-tz', name: 'Test', birthDate: '1990-05-15', syncStatus: 'local-only' } as Birthday;
      service.saveBirthday('user-123', birthday).subscribe({
        complete: () => {
          // First call is the birthday document; second is the rate-limit sentinel
          const birthdayData = setSpy.calls.first().args[1] as Record<string, unknown>;
          expect(birthdayData['birthDate']).toBe('1990-05-15');
          expect(timestampFromDateSpy).not.toHaveBeenCalled();
          done();
        },
        error: done.fail
      });
    });

    it('withRetry uses BASE_DELAY_MS for transient errors (not rate-limit)', (done) => {
      const transientError = Object.assign(new Error('Unavailable'), { code: 'unavailable' });
      let callCount = 0;
      const mockBatch = {
        set: jasmine.createSpy(),
        commit: jasmine.createSpy().and.callFake(() =>
          ++callCount === 1 ? Promise.reject(transientError) : Promise.resolve()
        )
      };
      spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').and.returnValue({
        writeBatch: jasmine.createSpy().and.returnValue(mockBatch),
        doc: jasmine.createSpy().and.returnValue({}),
        serverTimestamp: jasmine.createSpy().and.returnValue({}),
        Timestamp: { fromDate: jasmine.createSpy().and.returnValue({}) },
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      const delaySpy = (service as unknown as DelayableService).delayMs as jasmine.Spy;

      const birthday = { id: 'b-transient', name: 'Test', birthDate: '2000-01-01', syncStatus: 'local-only' } as Birthday;
      service.saveBirthday('user-123', birthday).subscribe({
        complete: () => {
          // jitterMs spied to 0: delay = 500 * 2^0 + 0 = 500
          expect(delaySpy).toHaveBeenCalledWith(500);
          done();
        },
        error: done.fail
      });
    });
  });

  describe('photo URL security', () => {
    const VALID_OPTIONS = { apiKey: 'test-api-key', projectId: 'test-project' };
    const DOWNLOAD_URL = 'https://firebasestorage.googleapis.com/v0/b/proj/o/users%2Fuid%2Fphoto%2F1234.jpg?alt=media&token=xyz';
    const STORAGE_PATH = 'users/uid/photo/1234.jpg';
    const RESOLVED_URL = 'https://firebasestorage.googleapis.com/v0/b/proj/o/users%2Fuid%2Fphoto%2F1234.jpg?alt=media&token=new';

    let service: FirestoreService;
    let loggerMock: jasmine.SpyObj<LoggerService>;
    let photoStorageMock: jasmine.SpyObj<PhotoStorageService>;

    beforeEach(() => {
      loggerMock = jasmine.createSpyObj('LoggerService', ['log', 'info', 'warn', 'error']);
      photoStorageMock = makePhotoStorageMock();

      TestBed.configureTestingModule({
        providers: [
          { provide: LoggerService, useValue: loggerMock },
          { provide: PhotoStorageService, useValue: photoStorageMock },
          { provide: FIREBASE_OPTIONS, useValue: VALID_OPTIONS },
          provideTranslateTesting()
        ]
      });

      service = TestBed.inject(FirestoreService);
      spyOn(service as unknown as { delayMs: (ms: number) => Promise<void> }, 'delayMs')
        .and.returnValue(Promise.resolve());
      spyOn(firebaseConfig.firebaseGetters, 'getFirebaseFirestore').and.returnValue(
        {} as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirebaseFirestore>
      );
    });

    it('saveBirthday stores photo as Storage path — not capability URL — in Firestore', (done) => {
      photoStorageMock.isStorageUrl.and.callFake((v: string) => v.startsWith('https://firebasestorage'));
      photoStorageMock.extractPath.and.returnValue(STORAGE_PATH);

      const setSpy = jasmine.createSpy('batch.set');
      spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').and.returnValue({
        writeBatch: jasmine.createSpy().and.returnValue({ set: setSpy, commit: jasmine.createSpy().and.resolveTo() }),
        doc: jasmine.createSpy().and.returnValue({}),
        serverTimestamp: jasmine.createSpy().and.returnValue({}),
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      const birthday = {
        id: 'b-photo', name: 'Test', birthDate: '2000-01-01',
        syncStatus: 'local-only', photo: DOWNLOAD_URL,
      } as Birthday;

      service.saveBirthday('user-123', birthday).subscribe({
        complete: () => {
          const data = setSpy.calls.first().args[1] as Record<string, unknown>;
          expect(data['photo']).toBe(STORAGE_PATH);
          expect(data['photo']).not.toContain('token=');
          done();
        },
        error: done.fail
      });
    });

    it('getBirthdays resolves Storage paths to download URLs for IndexedDB', (done) => {
      photoStorageMock.isStorageUrl.and.callFake((v: string) => v.startsWith('https://firebasestorage'));
      photoStorageMock.isBase64.and.returnValue(false);
      photoStorageMock.resolveUrl.and.resolveTo(RESOLVED_URL);

      const mockDoc = {
        id: 'b-1',
        data: () => ({
          name: 'Test', birthDate: '2000-01-01', syncStatus: 'synced',
          ownerId: 'user-123', photo: STORAGE_PATH,
        }),
      };

      spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').and.returnValue({
        collection: jasmine.createSpy().and.returnValue({}),
        getDocs: jasmine.createSpy().and.resolveTo({ docs: [mockDoc] }),
        Timestamp: class {},
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      service.getBirthdays('user-123').subscribe({
        next: (birthdays) => {
          expect(birthdays[0].photo).toBe(RESOLVED_URL);
          expect(photoStorageMock.resolveUrl).toHaveBeenCalledWith(STORAGE_PATH);
          done();
        },
        error: done.fail
      });
    });

    it('getBirthdays passes through legacy capability URLs unchanged', (done) => {
      photoStorageMock.isStorageUrl.and.callFake((v: string) => v.startsWith('https://firebasestorage'));
      photoStorageMock.isBase64.and.returnValue(false);

      const mockDoc = {
        id: 'b-legacy',
        data: () => ({
          name: 'Legacy', birthDate: '1990-01-01', syncStatus: 'synced',
          ownerId: 'user-123', photo: DOWNLOAD_URL,
        }),
      };

      spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').and.returnValue({
        collection: jasmine.createSpy().and.returnValue({}),
        getDocs: jasmine.createSpy().and.resolveTo({ docs: [mockDoc] }),
        Timestamp: class {},
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      service.getBirthdays('user-123').subscribe({
        next: (birthdays) => {
          expect(birthdays[0].photo).toBe(DOWNLOAD_URL);
          expect(photoStorageMock.resolveUrl).not.toHaveBeenCalled();
          done();
        },
        error: done.fail
      });
    });

    it('migrateCapabilityUrls rewrites documents with capability URLs to Storage paths', (done) => {
      photoStorageMock.isStorageUrl.and.callFake((v: string) => v.startsWith('https://firebasestorage'));
      photoStorageMock.extractPath.and.returnValue(STORAGE_PATH);

      const setSpy = jasmine.createSpy('batch.set');
      const mockDoc = {
        id: 'b-migrate',
        data: () => ({
          name: 'Test', birthDate: '2000-01-01', syncStatus: 'synced',
          ownerId: 'user-123', photo: DOWNLOAD_URL,
        }),
      };

      spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').and.returnValue({
        collection: jasmine.createSpy().and.returnValue({}),
        getDocs: jasmine.createSpy().and.resolveTo({ docs: [mockDoc] }),
        writeBatch: jasmine.createSpy().and.returnValue({
          set: setSpy,
          commit: jasmine.createSpy().and.resolveTo(),
        }),
        doc: jasmine.createSpy().and.returnValue({}),
        serverTimestamp: jasmine.createSpy().and.returnValue({}),
        Timestamp: class {},
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      service.migrateCapabilityUrls('user-123').then(() => {
        const data = setSpy.calls.first().args[1] as Record<string, unknown>;
        expect(data['photo']).toBe(STORAGE_PATH);
        expect(data['photo']).not.toContain('token=');
        expect(loggerMock.info).toHaveBeenCalledWith(
          jasmine.stringContaining('migrated 1')
        );
        done();
      }).catch(done.fail);
    });

    it('migrateCapabilityUrls is a no-op when all documents already use paths', (done) => {
      photoStorageMock.isStorageUrl.and.returnValue(false);

      const writeBatchSpy = jasmine.createSpy('writeBatch');
      const mockDoc = {
        id: 'b-already',
        data: () => ({
          name: 'Test', birthDate: '1990-01-01', syncStatus: 'synced',
          ownerId: 'user-123', photo: STORAGE_PATH,
        }),
      };

      spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').and.returnValue({
        collection: jasmine.createSpy().and.returnValue({}),
        getDocs: jasmine.createSpy().and.resolveTo({ docs: [mockDoc] }),
        writeBatch: writeBatchSpy,
        Timestamp: class {},
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      service.migrateCapabilityUrls('user-123').then(() => {
        expect(writeBatchSpy).not.toHaveBeenCalled();
        expect(loggerMock.info).toHaveBeenCalledWith(
          jasmine.stringContaining('up to date')
        );
        done();
      }).catch(done.fail);
    });

    it('migrateCapabilityUrls is a no-op when Firebase is not configured', (done) => {
      // service in this describe has VALID_OPTIONS; re-create with undefined to test the guard
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          { provide: LoggerService, useValue: loggerMock },
          { provide: PhotoStorageService, useValue: photoStorageMock },
          { provide: FIREBASE_OPTIONS, useValue: undefined },
          provideTranslateTesting()
        ]
      });
      const unconfiguredService = TestBed.inject(FirestoreService);

      unconfiguredService.migrateCapabilityUrls('user-123').then(() => {
        expect(photoStorageMock.isStorageUrl).not.toHaveBeenCalled();
        done();
      }).catch(done.fail);
    });
  });
});
