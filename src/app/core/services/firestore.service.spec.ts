import { TestBed } from '@angular/core/testing';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import type { Mock, MockedObject } from 'vitest';

import * as firebaseConfig from '../../firebase.config';
import { FIREBASE_OPTIONS } from '../../firebase.config';
import { type Birthday, type Category } from '../../shared/models/birthday.model';
import { provideTranslateTesting } from '../../testing/translate-testing';
import { FirestoreService } from './firestore.service';
import { LoggerService } from './logger.service';
import { PhotoStorageService } from './photo-storage.service';

function makePhotoStorageMock(): MockedObject<PhotoStorageService> {
  const mock = {
    isStorageUrl: vi.fn().mockName('PhotoStorageService.isStorageUrl'),
    isBase64: vi.fn().mockName('PhotoStorageService.isBase64'),
    extractPath: vi.fn().mockName('PhotoStorageService.extractPath'),
    resolveUrl: vi.fn().mockName('PhotoStorageService.resolveUrl')
  } as unknown as MockedObject<PhotoStorageService>;
  mock.isStorageUrl.mockReturnValue(false);
  mock.isBase64.mockReturnValue(false);
  mock.extractPath.mockReturnValue(null);
  mock.resolveUrl.mockResolvedValue(null);
  return mock;
}

describe('FirestoreService', () => {
  describe('basic tests', () => {
    let service: FirestoreService;
    let loggerMock: MockedObject<LoggerService>;

    beforeEach(() => {
      loggerMock = {
        log: vi.fn().mockName('LoggerService.log'),
        info: vi.fn().mockName('LoggerService.info'),
        warn: vi.fn().mockName('LoggerService.warn'),
        error: vi.fn().mockName('LoggerService.error')
      } as unknown as MockedObject<LoggerService>;

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

    it('birthdays$ emits [] immediately on subscribe — BehaviorSubject prevents race condition', async () => {
      const value = await firstValueFrom(service.birthdays$);
      expect(value).toEqual([]);
    });

    it('birthdays$ replays last value to a late subscriber — no first-snapshot loss', async () => {
      const earlyBirthday = { id: 'b-early', name: 'Early', birthDate: '2000-01-01' } as Birthday;
      (service as unknown as {
        birthdaysSubject: {
          next: (v: Birthday[]) => void;
        };
      })
        .birthdaysSubject.next([earlyBirthday]);

      // Subscribe AFTER the emission — BehaviorSubject guarantees delivery
      const value = await firstValueFrom(service.birthdays$);
      expect(value).toEqual([earlyBirthday]);
    });

    it('categories$ should be an observable', () => {
      expect(service.categories$).toBeTruthy();
      expect(service.categories$.subscribe).toBeDefined();
    });

    it('categories$ emits [] immediately on subscribe — BehaviorSubject prevents race condition', async () => {
      const value = await firstValueFrom(service.categories$);
      expect(value).toEqual([]);
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
    let loggerMock: MockedObject<LoggerService>;
    let mockBatch: {
      set: Mock;
      delete: Mock;
      commit: Mock;
    };

    beforeEach(() => {
      loggerMock = {
        log: vi.fn().mockName('LoggerService.log'),
        info: vi.fn().mockName('LoggerService.info'),
        warn: vi.fn().mockName('LoggerService.warn'),
        error: vi.fn().mockName('LoggerService.error')
      } as unknown as MockedObject<LoggerService>;

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
      vi.spyOn(service as unknown as {
        delayMs: (ms: number) => Promise<void>;
      }, 'delayMs').mockReturnValue(Promise.resolve());

      mockBatch = {
        set: vi.fn(),
        delete: vi.fn(),
        commit: vi.fn().mockRejectedValue(networkError),
      };

      // firebaseGetters is a plain object, so its properties are writable —
      // no Object.defineProperty tricks needed. spyOn works out of the box.
      vi.spyOn(firebaseConfig.firebaseGetters, 'getFirebaseFirestore').mockReturnValue({} as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirebaseFirestore>);
    });

    it('getBirthdays should log and rethrow on getDocs failure', async () => {
      vi.spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').mockReturnValue({
        collection: vi.fn().mockReturnValue({}),
        getDocs: vi.fn().mockRejectedValue(networkError),
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      const err = await firstValueFrom(service.getBirthdays('user-123')).catch((e: unknown) => e);
      expect(err).toBe(networkError);
      expect(loggerMock.error).toHaveBeenCalledWith('[Firestore] Failed to fetch birthdays:', networkError);
    });

    it('getCategories should log and rethrow on getDocs failure', async () => {
      vi.spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').mockReturnValue({
        collection: vi.fn().mockReturnValue({}),
        getDocs: vi.fn().mockRejectedValue(networkError),
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      const err = await firstValueFrom(service.getCategories('user-123')).catch((e: unknown) => e);
      expect(err).toBe(networkError);
      expect(loggerMock.error).toHaveBeenCalledWith('[Firestore] Failed to fetch categories:', networkError);
    });

    it('saveBirthday should log and rethrow on commit failure', async () => {
      vi.spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').mockReturnValue({
        writeBatch: vi.fn().mockReturnValue(mockBatch),
        doc: vi.fn().mockReturnValue({}),
        serverTimestamp: vi.fn().mockReturnValue({}),
        Timestamp: { fromDate: vi.fn().mockReturnValue({}) },
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      const birthday = { id: 'b-1', name: 'Test', birthDate: '2000-01-01', syncStatus: 'local-only' } as Birthday;
      const err = await firstValueFrom(service.saveBirthday('user-123', birthday)).catch((e: unknown) => e);
      expect(err).toBe(networkError);
      expect(loggerMock.error).toHaveBeenCalledWith('[Firestore] Failed to save birthday:', networkError);
    });

    it('deleteBirthday should log and rethrow on commit failure', async () => {
      vi.spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').mockReturnValue({
        writeBatch: vi.fn().mockReturnValue(mockBatch),
        doc: vi.fn().mockReturnValue({}),
        serverTimestamp: vi.fn().mockReturnValue({}),
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      const err = await firstValueFrom(service.deleteBirthday('user-123', 'b-1')).catch((e: unknown) => e);
      expect(err).toBe(networkError);
      expect(loggerMock.error).toHaveBeenCalledWith('[Firestore] Failed to delete birthday:', networkError);
    });

    it('saveBirthdaysBatch should log and rethrow on commit failure', async () => {
      vi.spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').mockReturnValue({
        writeBatch: vi.fn().mockReturnValue(mockBatch),
        doc: vi.fn().mockReturnValue({}),
        serverTimestamp: vi.fn().mockReturnValue({}),
        Timestamp: { fromDate: vi.fn().mockReturnValue({}) },
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      const birthday = { id: 'b-1', name: 'Test', birthDate: '2000-01-01', syncStatus: 'local-only' } as Birthday;
      const err = await firstValueFrom(service.saveBirthdaysBatch('user-123', [birthday])).catch((e: unknown) => e);
      expect(err).toBe(networkError);
      expect(loggerMock.error).toHaveBeenCalledWith('[Firestore] Batch save failed:', networkError);
    });

    it('saveCategory should log and rethrow on commit failure', async () => {
      vi.spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').mockReturnValue({
        writeBatch: vi.fn().mockReturnValue(mockBatch),
        doc: vi.fn().mockReturnValue({}),
        serverTimestamp: vi.fn().mockReturnValue({}),
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      const category = { id: 'c-1', name: 'Test', icon: 'star', color: '#000' } as Category;
      const err = await firstValueFrom(service.saveCategory('user-123', category)).catch((e: unknown) => e);
      expect(err).toBe(networkError);
      expect(loggerMock.error).toHaveBeenCalledWith('[Firestore] Failed to save category:', networkError);
    });

    it('deleteCategory should log and rethrow on commit failure', async () => {
      vi.spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').mockReturnValue({
        writeBatch: vi.fn().mockReturnValue(mockBatch),
        doc: vi.fn().mockReturnValue({}),
        serverTimestamp: vi.fn().mockReturnValue({}),
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      const err = await firstValueFrom(service.deleteCategory('user-123', 'c-1')).catch((e: unknown) => e);
      expect(err).toBe(networkError);
      expect(loggerMock.error).toHaveBeenCalledWith('[Firestore] Failed to delete category:', networkError);
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
          {
            provide: LoggerService, useValue: {
              log: vi.fn().mockName('LoggerService.log'),
              info: vi.fn().mockName('LoggerService.info'),
              warn: vi.fn().mockName('LoggerService.warn'),
              error: vi.fn().mockName('LoggerService.error')
            }
          },
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
    let loggerMock: MockedObject<LoggerService>;

    interface DelayableService {
      delayMs: (ms: number) => Promise<void>;
      jitterMs: () => number;
    }
    interface InspectableService {
      isRetryable: (e: unknown) => boolean;
      isRateLimited: (e: unknown) => boolean;
    }

    beforeEach(() => {
      loggerMock = {
        log: vi.fn().mockName('LoggerService.log'),
        info: vi.fn().mockName('LoggerService.info'),
        warn: vi.fn().mockName('LoggerService.warn'),
        error: vi.fn().mockName('LoggerService.error')
      } as unknown as MockedObject<LoggerService>;

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
      vi.spyOn(service as unknown as DelayableService, 'delayMs').mockReturnValue(Promise.resolve());
      vi.spyOn(service as unknown as DelayableService, 'jitterMs').mockReturnValue(0);

      vi.spyOn(firebaseConfig.firebaseGetters, 'getFirebaseFirestore').mockReturnValue({} as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirebaseFirestore>);
    });

    it('isRetryable returns true for "unavailable"', () => {
      const err = Object.assign(new Error(), { code: 'unavailable' });
      expect((service as unknown as InspectableService).isRetryable(err)).toBe(true);
    });

    it('isRetryable returns true for namespaced "firestore/unavailable"', () => {
      const err = Object.assign(new Error(), { code: 'firestore/unavailable' });
      expect((service as unknown as InspectableService).isRetryable(err)).toBe(true);
    });

    it('isRetryable returns true for "deadline-exceeded" and "internal"', () => {
      const fn = (service as unknown as InspectableService).isRetryable.bind(service);
      expect(fn(Object.assign(new Error(), { code: 'deadline-exceeded' }))).toBe(true);
      expect(fn(Object.assign(new Error(), { code: 'internal' }))).toBe(true);
    });

    it('isRetryable returns false for non-retryable Firebase codes', () => {
      const fn = (service as unknown as InspectableService).isRetryable.bind(service);
      expect(fn(Object.assign(new Error(), { code: 'permission-denied' }))).toBe(false);
      expect(fn(Object.assign(new Error(), { code: 'not-found' }))).toBe(false);
      expect(fn(Object.assign(new Error(), { code: 'unauthenticated' }))).toBe(false);
    });

    it('isRetryable returns false for errors without a code property', () => {
      const fn = (service as unknown as InspectableService).isRetryable.bind(service);
      expect(fn(new Error('plain error'))).toBe(false);
      expect(fn('string error')).toBe(false);
      expect(fn(null)).toBe(false);
      expect(fn(42)).toBe(false);
    });

    it('saveBirthday retries once on retryable error and succeeds', async () => {
      let callCount = 0;
      const mockBatch = {
        set: vi.fn(),
        commit: vi.fn().mockImplementation(() => ++callCount === 1 ? Promise.reject(retryableError) : Promise.resolve())
      };
      vi.spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').mockReturnValue({
        writeBatch: vi.fn().mockReturnValue(mockBatch),
        doc: vi.fn().mockReturnValue({}),
        serverTimestamp: vi.fn().mockReturnValue({}),
        Timestamp: { fromDate: vi.fn().mockReturnValue({}) },
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      const birthday = { id: 'b-retry', name: 'Test', birthDate: '2000-01-01', syncStatus: 'local-only' } as Birthday;
      await lastValueFrom(service.saveBirthday('user-123', birthday), { defaultValue: undefined });
      expect(callCount).toBe(2);
      expect(loggerMock.warn).toHaveBeenCalled();
      expect(loggerMock.info).toHaveBeenCalledWith('[Firestore] Birthday saved:', 'b-retry');
    });

    it('saveBirthday exhausts retries (4 total attempts) and rethrows', async () => {
      let callCount = 0;
      const mockBatch = {
        set: vi.fn(),
        commit: vi.fn().mockImplementation(() => {
          callCount++;
          return Promise.reject(retryableError);
        })
      };
      vi.spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').mockReturnValue({
        writeBatch: vi.fn().mockReturnValue(mockBatch),
        doc: vi.fn().mockReturnValue({}),
        serverTimestamp: vi.fn().mockReturnValue({}),
        Timestamp: { fromDate: vi.fn().mockReturnValue({}) },
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      const birthday = { id: 'b-exhaust', name: 'Test', birthDate: '2000-01-01', syncStatus: 'local-only' } as Birthday;
      const err = await firstValueFrom(service.saveBirthday('user-123', birthday)).catch((e: unknown) => e);
      expect(err).toBe(retryableError);
      expect(callCount).toBe(4); // 1 initial + 3 retries
      expect(loggerMock.error).toHaveBeenCalledWith('[Firestore] Failed to save birthday:', retryableError);
    });

    it('getBirthdays retries on retryable error and succeeds', async () => {
      let callCount = 0;
      vi.spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').mockReturnValue({
        collection: vi.fn().mockReturnValue({}),
        getDocs: vi.fn().mockImplementation(() => ++callCount === 1
          ? Promise.reject(retryableError)
          : Promise.resolve({ docs: [] })),
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      const result = await firstValueFrom(service.getBirthdays('user-123'));
      expect(result).toEqual([]);
      expect(callCount).toBe(2);
    });

    it('deleteCategory retries on retryable error and succeeds', async () => {
      let callCount = 0;
      const mockBatch = {
        set: vi.fn(),
        delete: vi.fn(),
        commit: vi.fn().mockImplementation(() => ++callCount === 1 ? Promise.reject(retryableError) : Promise.resolve())
      };
      vi.spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').mockReturnValue({
        writeBatch: vi.fn().mockReturnValue(mockBatch),
        doc: vi.fn().mockReturnValue({}),
        serverTimestamp: vi.fn().mockReturnValue({}),
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      await lastValueFrom(service.deleteCategory('user-123', 'c-retry'), { defaultValue: undefined });
      expect(callCount).toBe(2);
    });

    // ── isRateLimited ─────────────────────────────────────────────────────────
    describe('isRateLimited', () => {
      it('returns true for "resource-exhausted"', () => {
        const err = Object.assign(new Error(), { code: 'resource-exhausted' });
        expect((service as unknown as InspectableService).isRateLimited(err)).toBe(true);
      });

      it('returns true for namespaced "firestore/resource-exhausted"', () => {
        const err = Object.assign(new Error(), { code: 'firestore/resource-exhausted' });
        expect((service as unknown as InspectableService).isRateLimited(err)).toBe(true);
      });

      it('returns false for other retryable codes', () => {
        const fn = (service as unknown as InspectableService).isRateLimited.bind(service);
        expect(fn(Object.assign(new Error(), { code: 'unavailable' }))).toBe(false);
        expect(fn(Object.assign(new Error(), { code: 'internal' }))).toBe(false);
      });

      it('returns false for errors without a code', () => {
        const fn = (service as unknown as InspectableService).isRateLimited.bind(service);
        expect(fn(new Error('plain'))).toBe(false);
        expect(fn(null)).toBe(false);
        expect(fn('string')).toBe(false);
      });
    });

    // ── rate-limit backoff ────────────────────────────────────────────────────
    it('isRetryable returns true for "resource-exhausted"', () => {
      const err = Object.assign(new Error(), { code: 'resource-exhausted' });
      expect((service as unknown as InspectableService).isRetryable(err)).toBe(true);
    });

    it('saveBirthday retries on resource-exhausted and uses longer base delay (1000 ms)', async () => {
      const rateLimitError = Object.assign(new Error('Quota exceeded'), { code: 'resource-exhausted' });
      let callCount = 0;
      const mockBatch = {
        set: vi.fn(),
        commit: vi.fn().mockImplementation(() => ++callCount === 1 ? Promise.reject(rateLimitError) : Promise.resolve())
      };
      vi.spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').mockReturnValue({
        writeBatch: vi.fn().mockReturnValue(mockBatch),
        doc: vi.fn().mockReturnValue({}),
        serverTimestamp: vi.fn().mockReturnValue({}),
        Timestamp: { fromDate: vi.fn().mockReturnValue({}) },
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      const delaySpy = (service as unknown as DelayableService).delayMs as Mock;

      const birthday = { id: 'b-ratelimit', name: 'Test', birthDate: '2000-01-01', syncStatus: 'local-only' } as Birthday;
      await lastValueFrom(service.saveBirthday('user-123', birthday), { defaultValue: undefined });
      expect(callCount).toBe(2);
      // jitterMs is spied to return 0, so delay = 1000 * 2^0 + 0 = 1000
      expect(delaySpy).toHaveBeenCalledWith(1000);
    });

    it('saveBirthday exhausts retries on resource-exhausted and rethrows', async () => {
      const rateLimitError = Object.assign(new Error('Quota exceeded'), { code: 'resource-exhausted' });
      let callCount = 0;
      const mockBatch = {
        set: vi.fn(),
        commit: vi.fn().mockImplementation(() => { callCount++; return Promise.reject(rateLimitError); })
      };
      vi.spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').mockReturnValue({
        writeBatch: vi.fn().mockReturnValue(mockBatch),
        doc: vi.fn().mockReturnValue({}),
        serverTimestamp: vi.fn().mockReturnValue({}),
        Timestamp: { fromDate: vi.fn().mockReturnValue({}) },
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      const birthday = { id: 'b-ratelimit-exhaust', name: 'Test', birthDate: '2000-01-01', syncStatus: 'local-only' } as Birthday;
      const err = await firstValueFrom(service.saveBirthday('user-123', birthday)).catch((e: unknown) => e);
      expect(err).toBe(rateLimitError);
      expect(callCount).toBe(4); // 1 initial + 3 retries
      expect(loggerMock.error).toHaveBeenCalledWith('[Firestore] Failed to save birthday:', rateLimitError);
    });

    it('saveBirthday stores birthDate as YYYY-MM-DD string — no Timestamp to avoid timezone shift', async () => {
      // Regression guard: birthDate must be stored as a plain string so that
      // reading it back in a different timezone cannot shift the date by ±1 day.
      // batch.set is called twice: once for the birthday, once for the rate-limit
      // sentinel — so we inspect the first call's arguments.
      const setSpy = vi.fn();
      const successBatch = {
        set: setSpy,
        commit: vi.fn().mockResolvedValue(undefined)
      };
      const timestampFromDateSpy = vi.fn();
      vi.spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').mockReturnValue({
        writeBatch: vi.fn().mockReturnValue(successBatch),
        doc: vi.fn().mockReturnValue({}),
        serverTimestamp: vi.fn().mockReturnValue({}),
        Timestamp: { fromDate: timestampFromDateSpy },
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      const birthday = { id: 'b-tz', name: 'Test', birthDate: '1990-05-15', syncStatus: 'local-only' } as Birthday;
      await lastValueFrom(service.saveBirthday('user-123', birthday), { defaultValue: undefined });
      // First call is the birthday document; second is the rate-limit sentinel
      const birthdayData = vi.mocked(setSpy).mock.calls[0][1] as Record<string, unknown>;
      expect(birthdayData['birthDate']).toBe('1990-05-15');
      expect(timestampFromDateSpy).not.toHaveBeenCalled();
    });

    it('withRetry uses BASE_DELAY_MS for transient errors (not rate-limit)', async () => {
      const transientError = Object.assign(new Error('Unavailable'), { code: 'unavailable' });
      let callCount = 0;
      const mockBatch = {
        set: vi.fn(),
        commit: vi.fn().mockImplementation(() => ++callCount === 1 ? Promise.reject(transientError) : Promise.resolve())
      };
      vi.spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').mockReturnValue({
        writeBatch: vi.fn().mockReturnValue(mockBatch),
        doc: vi.fn().mockReturnValue({}),
        serverTimestamp: vi.fn().mockReturnValue({}),
        Timestamp: { fromDate: vi.fn().mockReturnValue({}) },
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      const delaySpy = (service as unknown as DelayableService).delayMs as Mock;

      const birthday = { id: 'b-transient', name: 'Test', birthDate: '2000-01-01', syncStatus: 'local-only' } as Birthday;
      await lastValueFrom(service.saveBirthday('user-123', birthday), { defaultValue: undefined });
      // jitterMs spied to 0: delay = 500 * 2^0 + 0 = 500
      expect(delaySpy).toHaveBeenCalledWith(500);
    });
  });

  describe('photo URL security', () => {
    const VALID_OPTIONS = { apiKey: 'test-api-key', projectId: 'test-project' };
    const DOWNLOAD_URL = 'https://firebasestorage.googleapis.com/v0/b/proj/o/users%2Fuid%2Fphoto%2F1234.jpg?alt=media&token=xyz';
    const STORAGE_PATH = 'users/uid/photo/1234.jpg';
    const RESOLVED_URL = 'https://firebasestorage.googleapis.com/v0/b/proj/o/users%2Fuid%2Fphoto%2F1234.jpg?alt=media&token=new';

    let service: FirestoreService;
    let loggerMock: MockedObject<LoggerService>;
    let photoStorageMock: MockedObject<PhotoStorageService>;

    beforeEach(() => {
      loggerMock = {
        log: vi.fn().mockName('LoggerService.log'),
        info: vi.fn().mockName('LoggerService.info'),
        warn: vi.fn().mockName('LoggerService.warn'),
        error: vi.fn().mockName('LoggerService.error')
      } as unknown as MockedObject<LoggerService>;
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
      vi.spyOn(service as unknown as {
        delayMs: (ms: number) => Promise<void>;
      }, 'delayMs').mockReturnValue(Promise.resolve());
      vi.spyOn(firebaseConfig.firebaseGetters, 'getFirebaseFirestore').mockReturnValue({} as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirebaseFirestore>);
    });

    it('saveBirthday stores photo as Storage path — not capability URL — in Firestore', async () => {
      photoStorageMock.isStorageUrl.mockImplementation((v: string) => v.startsWith('https://firebasestorage'));
      photoStorageMock.extractPath.mockReturnValue(STORAGE_PATH);

      const setSpy = vi.fn();
      vi.spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').mockReturnValue({
        writeBatch: vi.fn().mockReturnValue({ set: setSpy, commit: vi.fn().mockResolvedValue(undefined) }),
        doc: vi.fn().mockReturnValue({}),
        serverTimestamp: vi.fn().mockReturnValue({}),
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      const birthday = {
        id: 'b-photo', name: 'Test', birthDate: '2000-01-01',
        syncStatus: 'local-only', photo: DOWNLOAD_URL,
      } as Birthday;

      await lastValueFrom(service.saveBirthday('user-123', birthday), { defaultValue: undefined });
      const data = vi.mocked(setSpy).mock.calls[0][1] as Record<string, unknown>;
      expect(data['photo']).toBe(STORAGE_PATH);
      expect(data['photo']).not.toContain('token=');
    });

    it('getBirthdays resolves Storage paths to download URLs for IndexedDB', async () => {
      photoStorageMock.isStorageUrl.mockImplementation((v: string) => v.startsWith('https://firebasestorage'));
      photoStorageMock.isBase64.mockReturnValue(false);
      photoStorageMock.resolveUrl.mockResolvedValue(RESOLVED_URL);

      const mockDoc = {
        id: 'b-1',
        data: () => ({
          name: 'Test', birthDate: '2000-01-01', syncStatus: 'synced',
          ownerId: 'user-123', photo: STORAGE_PATH,
        }),
      };

      vi.spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').mockReturnValue({
        collection: vi.fn().mockReturnValue({}),
        getDocs: vi.fn().mockResolvedValue({ docs: [mockDoc] }),
        Timestamp: class {
        },
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      const birthdays = await firstValueFrom(service.getBirthdays('user-123'));
      expect(birthdays[0].photo).toBe(RESOLVED_URL);
      expect(photoStorageMock.resolveUrl).toHaveBeenCalledWith(STORAGE_PATH);
    });

    it('getBirthdays passes through legacy capability URLs unchanged', async () => {
      photoStorageMock.isStorageUrl.mockImplementation((v: string) => v.startsWith('https://firebasestorage'));
      photoStorageMock.isBase64.mockReturnValue(false);

      const mockDoc = {
        id: 'b-legacy',
        data: () => ({
          name: 'Legacy', birthDate: '1990-01-01', syncStatus: 'synced',
          ownerId: 'user-123', photo: DOWNLOAD_URL,
        }),
      };

      vi.spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').mockReturnValue({
        collection: vi.fn().mockReturnValue({}),
        getDocs: vi.fn().mockResolvedValue({ docs: [mockDoc] }),
        Timestamp: class {
        },
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      const birthdays = await firstValueFrom(service.getBirthdays('user-123'));
      expect(birthdays[0].photo).toBe(DOWNLOAD_URL);
      expect(photoStorageMock.resolveUrl).not.toHaveBeenCalled();
    });

    it('migrateCapabilityUrls rewrites documents with capability URLs to Storage paths', async () => {
      photoStorageMock.isStorageUrl.mockImplementation((v: string) => v.startsWith('https://firebasestorage'));
      photoStorageMock.extractPath.mockReturnValue(STORAGE_PATH);

      const setSpy = vi.fn();
      const mockDoc = {
        id: 'b-migrate',
        data: () => ({
          name: 'Test', birthDate: '2000-01-01', syncStatus: 'synced',
          ownerId: 'user-123', photo: DOWNLOAD_URL,
        }),
      };

      vi.spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').mockReturnValue({
        collection: vi.fn().mockReturnValue({}),
        getDocs: vi.fn().mockResolvedValue({ docs: [mockDoc] }),
        writeBatch: vi.fn().mockReturnValue({
          set: setSpy,
          commit: vi.fn().mockResolvedValue(undefined),
        }),
        doc: vi.fn().mockReturnValue({}),
        serverTimestamp: vi.fn().mockReturnValue({}),
        Timestamp: class {
        },
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      await service.migrateCapabilityUrls('user-123');
      const data = vi.mocked(setSpy).mock.calls[0][1] as Record<string, unknown>;
      expect(data['photo']).toBe(STORAGE_PATH);
      expect(data['photo']).not.toContain('token=');
      expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('migrated 1'));
    });

    it('migrateCapabilityUrls is a no-op when all documents already use paths', async () => {
      photoStorageMock.isStorageUrl.mockReturnValue(false);

      const writeBatchSpy = vi.fn();
      const mockDoc = {
        id: 'b-already',
        data: () => ({
          name: 'Test', birthDate: '1990-01-01', syncStatus: 'synced',
          ownerId: 'user-123', photo: STORAGE_PATH,
        }),
      };

      vi.spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').mockReturnValue({
        collection: vi.fn().mockReturnValue({}),
        getDocs: vi.fn().mockResolvedValue({ docs: [mockDoc] }),
        writeBatch: writeBatchSpy,
        Timestamp: class {
        },
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      await service.migrateCapabilityUrls('user-123');
      expect(writeBatchSpy).not.toHaveBeenCalled();
      expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('up to date'));
    });

    it('migrateCapabilityUrls is a no-op when Firebase is not configured', async () => {
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

      await unconfiguredService.migrateCapabilityUrls('user-123');
      expect(photoStorageMock.isStorageUrl).not.toHaveBeenCalled();
    });
  });
});
