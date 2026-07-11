import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideTranslateTesting } from '../../testing/translate-testing';
import { type ErrorReport,ErrorReportingService } from './error-reporting.service';
import { IndexedDBConnectionService } from './indexeddb-connection.service';
import { SILENT_LOGGER_PROVIDER } from './logger.service';

describe('ErrorReportingService', () => {
  let service: ErrorReportingService;
  let dbConnection: IndexedDBConnectionService;

  function createReport(overrides: Partial<ErrorReport> = {}): ErrorReport {
    return {
      error: new Error('test error'),
      type: 'runtime',
      technicalMessage: 'Test error occurred',
      timestamp: Date.now(),
      url: 'http://localhost',
      userAgent: 'test-agent',
      ...overrides
    };
  }

  async function clearErrorStore(): Promise<void> {
    try {
      // Race against a short timeout so a blocked IDB open never stalls the suite.
      const db = await Promise.race([
        dbConnection.getDB(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('IDB open timeout')), 3000)
        ),
      ]);
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('errorReports', 'readwrite');
        const store = tx.objectStore('errorReports');
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Store may not exist yet, or IDB was temporarily unavailable
    }
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [SILENT_LOGGER_PROVIDER, provideTranslateTesting()]
    });
    dbConnection = TestBed.inject(IndexedDBConnectionService);
    service = TestBed.inject(ErrorReportingService);
    await clearErrorStore();
  });

  afterEach(async () => {
    await service.clearErrors();
    dbConnection.close();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return empty array initially from getRecentErrors', async () => {
    const errors = await service.getRecentErrors();
    expect(errors).toEqual([]);
  });

  describe('captureError', () => {
    it('should persist an error to IndexedDB', async () => {
      service.captureError(createReport());

      // Wait for async persistence
      await new Promise(resolve => setTimeout(resolve, 100));

      const errors = await service.getRecentErrors();
      expect(errors.length).toBe(1);
      expect(errors[0].type).toBe('runtime');
      expect(errors[0].technicalMessage).toBe('Test error occurred');
    });

    it('should serialize Error objects with message, name, and stack', async () => {
      const testError = new Error('serialization test');
      testError.name = 'TestError';
      service.captureError(createReport({ error: testError }));

      await new Promise(resolve => setTimeout(resolve, 100));

      const errors = await service.getRecentErrors();
      expect(errors.length).toBe(1);
      const serialized = errors[0].serializedError as { message: string; name: string; stack?: string };
      expect(serialized.message).toBe('serialization test');
      expect(serialized.name).toBe('TestError');
      expect(serialized.stack).toBeDefined();
    });

    it('should serialize string errors directly', async () => {
      service.captureError(createReport({ error: 'plain string error' }));

      await new Promise(resolve => setTimeout(resolve, 100));

      const errors = await service.getRecentErrors();
      expect(errors.length).toBe(1);
      expect(errors[0].serializedError).toBe('plain string error');
    });

    it('should serialize non-Error objects as JSON', async () => {
      service.captureError(createReport({ error: { code: 42, detail: 'object error' } }));

      await new Promise(resolve => setTimeout(resolve, 100));

      const errors = await service.getRecentErrors();
      expect(errors.length).toBe(1);
      const parsed = JSON.parse(errors[0].serializedError as string);
      expect(parsed.code).toBe(42);
      expect(parsed.detail).toBe('object error');
    });

    it('should persist multiple errors to IndexedDB', async () => {
      service.captureError(createReport({ technicalMessage: 'error 1' }));
      service.captureError(createReport({ technicalMessage: 'error 2' }));
      service.captureError(createReport({ technicalMessage: 'error 3' }));

      await new Promise(resolve => setTimeout(resolve, 100));

      const errors = await service.getRecentErrors();
      expect(errors.length).toBe(3);
    });
  });

  describe('clearErrors', () => {
    it('should clear IndexedDB', async () => {
      service.captureError(createReport());
      service.captureError(createReport());
      await new Promise(resolve => setTimeout(resolve, 100));

      let errors = await service.getRecentErrors();
      expect(errors.length).toBe(2);

      await service.clearErrors();

      errors = await service.getRecentErrors();
      expect(errors.length).toBe(0);
    });
  });

  describe('pruning', () => {
    it('should prune errors beyond MAX_STORED_ERRORS (200)', async () => {
      // Insert 205 errors directly into IndexedDB
      const db = await dbConnection.getDB();
      for (let i = 0; i < 205; i++) {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction('errorReports', 'readwrite');
          const store = tx.objectStore('errorReports');
          const req = store.add({
            type: 'test',
            technicalMessage: `error ${i}`,
            timestamp: 1000 + i,
            serializedError: `error ${i}`
          });
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      }

      // Pruning runs every 20 captures, so capture 20 errors to trigger it
      for (let i = 0; i < 20; i++) {
        service.captureError(createReport({ timestamp: 9000 + i }));
      }
      await new Promise(resolve => setTimeout(resolve, 300));

      const errors = await service.getRecentErrors();
      // 205 pre-seeded + 20 captured = 225, pruned to 200
      expect(errors.length).toBeLessThanOrEqual(200);
    });
  });
});

describe('ErrorReportingService SSR safety', () => {
  let service: ErrorReportingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SILENT_LOGGER_PROVIDER,
        { provide: PLATFORM_ID, useValue: 'server' }
      ]
    });
    service = TestBed.inject(ErrorReportingService);
  });

  it('should be created on server platform', () => {
    expect(service).toBeTruthy();
  });

  it('should return empty errors on server', async () => {
    const errors = await service.getRecentErrors();
    expect(errors).toEqual([]);
  });

  it('should not throw when capturing errors on server', () => {
    expect(() => service.captureError({
      error: new Error('server error'),
      type: 'runtime',
      technicalMessage: 'Should not throw',
      timestamp: Date.now()
    })).not.toThrow();
  });

  it('should not throw when clearing errors on server', async () => {
    await expectAsync(service.clearErrors()).toBeResolved();
  });
});
