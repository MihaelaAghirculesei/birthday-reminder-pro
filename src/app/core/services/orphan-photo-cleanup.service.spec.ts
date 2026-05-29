import { TestBed } from '@angular/core/testing';
import { OrphanPhotoCleanupService } from './orphan-photo-cleanup.service';
import { LoggerService } from './logger.service';
import { IndexedDBStorageService } from './offline-storage.service';
import { FIREBASE_OPTIONS, storageGetters } from '../../firebase.config';

const VALID_FIREBASE_OPTIONS = { apiKey: 'test-key', projectId: 'test-project' };

/** A Firebase Storage-style download URL for path "users/uid/photos/uuid.jpg". */
const STORAGE_URL =
  'https://firebasestorage.googleapis.com/v0/b/proj/o/users%2Fuid%2Fphotos%2Fuuid.jpg?alt=media&token=tok';

describe('OrphanPhotoCleanupService', () => {
  let service: OrphanPhotoCleanupService;
  let loggerMock: jasmine.SpyObj<LoggerService>;
  let offlineStorageMock: jasmine.SpyObj<IndexedDBStorageService>;

  function setup(opts: { firebase?: object | undefined } = {}): void {
    loggerMock = jasmine.createSpyObj<LoggerService>('LoggerService', ['info', 'warn', 'error']);
    offlineStorageMock = jasmine.createSpyObj<IndexedDBStorageService>('IndexedDBStorageService', [
      'getBirthdays',
    ]);
    offlineStorageMock.getBirthdays.and.resolveTo([]);

    TestBed.configureTestingModule({
      providers: [
        { provide: LoggerService, useValue: loggerMock },
        { provide: IndexedDBStorageService, useValue: offlineStorageMock },
        { provide: FIREBASE_OPTIONS, useValue: opts.firebase ?? undefined },
      ],
    });

    service = TestBed.inject(OrphanPhotoCleanupService);
  }

  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.removeItem('__orphan_cleanup_ts');
  });

  // ─── extractStoragePath ─────────────────────────────────────────────────────

  describe('extractStoragePath', () => {
    beforeEach(() => setup());

    it('decodes a standard Firebase Storage download URL', () => {
      expect(service.extractStoragePath(STORAGE_URL)).toBe('users/uid/photos/uuid.jpg');
    });

    it('handles nested paths with multiple encoded slashes', () => {
      const url =
        'https://firebasestorage.googleapis.com/v0/b/proj/o/a%2Fb%2Fc.jpg?alt=media';
      expect(service.extractStoragePath(url)).toBe('a/b/c.jpg');
    });

    it('stops at the query-string boundary', () => {
      const url = 'https://firebasestorage.googleapis.com/v0/b/proj/o/x.jpg?alt=media&token=1';
      expect(service.extractStoragePath(url)).toBe('x.jpg');
    });

    it('stops at the fragment boundary', () => {
      const url = 'https://firebasestorage.googleapis.com/v0/b/proj/o/x.jpg#frag';
      expect(service.extractStoragePath(url)).toBe('x.jpg');
    });

    it('returns null for an empty string', () => {
      expect(service.extractStoragePath('')).toBeNull();
    });

    it('returns null for a non-Storage URL that has no /o/ segment', () => {
      expect(service.extractStoragePath('https://example.com/photo.jpg')).toBeNull();
    });
  });

  // ─── isDue ──────────────────────────────────────────────────────────────────

  describe('isDue', () => {
    beforeEach(() => setup());

    it('returns true when no cleanup has ever run', () => {
      expect(service.isDue()).toBeTrue();
    });

    it('returns false when cleanup ran less than 24 h ago', () => {
      localStorage.setItem('__orphan_cleanup_ts', String(Date.now() - 1_000));
      expect(service.isDue()).toBeFalse();
    });

    it('returns true when cleanup ran exactly 24 h ago or longer', () => {
      const oneDayMs = 24 * 60 * 60 * 1000;
      localStorage.setItem('__orphan_cleanup_ts', String(Date.now() - oneDayMs - 1_000));
      expect(service.isDue()).toBeTrue();
    });

    it('returns true when localStorage throws', () => {
      spyOn(localStorage, 'getItem').and.throwError('QuotaExceededError');
      expect(service.isDue()).toBeTrue();
    });
  });

  // ─── cleanupOrphans ─────────────────────────────────────────────────────────

  describe('cleanupOrphans', () => {
    it('returns early and never touches Storage when Firebase is not configured', async () => {
      setup(); // FIREBASE_OPTIONS = undefined
      spyOn(storageGetters, 'initFirebase').and.resolveTo();

      await service.cleanupOrphans('uid');

      expect(storageGetters.initFirebase).not.toHaveBeenCalled();
    });

    it('returns early when cleanup is not due yet', async () => {
      setup({ firebase: VALID_FIREBASE_OPTIONS });
      localStorage.setItem('__orphan_cleanup_ts', String(Date.now() - 1_000));
      spyOn(storageGetters, 'initFirebase').and.resolveTo();

      await service.cleanupOrphans('uid');

      expect(storageGetters.initFirebase).not.toHaveBeenCalled();
    });

    it('returns early when storage SDK is not available after init', async () => {
      setup({ firebase: VALID_FIREBASE_OPTIONS });
      spyOn(storageGetters, 'initFirebase').and.resolveTo();
      spyOn(storageGetters, 'getFirebaseStorage').and.returnValue(null);
      spyOn(storageGetters, 'getStorageModule').and.returnValue(null);

      await service.cleanupOrphans('uid');

      expect(offlineStorageMock.getBirthdays).not.toHaveBeenCalled();
    });

    it('marks cleanup done and returns without deleting when the folder is empty', async () => {
      setup({ firebase: VALID_FIREBASE_OPTIONS });
      spyOn(service as unknown as { isDevEnvironment(): boolean }, 'isDevEnvironment').and.returnValue(false);
      const stMock = jasmine.createSpyObj('st', ['ref', 'listAll', 'deleteObject']);
      stMock.ref.and.returnValue({});
      stMock.listAll.and.resolveTo({ items: [] });

      spyOn(storageGetters, 'initFirebase').and.resolveTo();
      spyOn(storageGetters, 'getFirebaseStorage').and.returnValue({} as never);
      spyOn(storageGetters, 'getStorageModule').and.returnValue(stMock);

      await service.cleanupOrphans('uid');

      expect(stMock.deleteObject).not.toHaveBeenCalled();
      expect(localStorage.getItem('__orphan_cleanup_ts')).not.toBeNull();
    });

    it('deletes Storage files not referenced by any birthday', async () => {
      setup({ firebase: VALID_FIREBASE_OPTIONS });
      spyOn(service as unknown as { isDevEnvironment(): boolean }, 'isDevEnvironment').and.returnValue(false);

      const orphanRef = { fullPath: 'users/uid/photos/orphan.jpg' };
      const usedRef = { fullPath: 'users/uid/photos/used.jpg' };
      const usedUrl =
        'https://firebasestorage.googleapis.com/v0/b/proj/o/users%2Fuid%2Fphotos%2Fused.jpg?alt=media';

      offlineStorageMock.getBirthdays.and.resolveTo([
        { id: '1', photo: usedUrl } as never,
      ]);

      const stMock = jasmine.createSpyObj('st', ['ref', 'listAll', 'deleteObject']);
      stMock.ref.and.returnValue({});
      stMock.listAll.and.resolveTo({ items: [orphanRef, usedRef] });
      stMock.deleteObject.and.resolveTo();

      spyOn(storageGetters, 'initFirebase').and.resolveTo();
      spyOn(storageGetters, 'getFirebaseStorage').and.returnValue({} as never);
      spyOn(storageGetters, 'getStorageModule').and.returnValue(stMock);

      await service.cleanupOrphans('uid');

      expect(stMock.deleteObject).toHaveBeenCalledOnceWith(orphanRef);
      expect(stMock.deleteObject).not.toHaveBeenCalledWith(usedRef);
      expect(loggerMock.info).toHaveBeenCalledWith(
        '[OrphanCleanup] Deleted orphan:',
        orphanRef.fullPath
      );
    });

    it('skips files referenced only via rememberPhoto', async () => {
      setup({ firebase: VALID_FIREBASE_OPTIONS });

      const rememberedRef = { fullPath: 'users/uid/photos/remembered.jpg' };
      const remUrl =
        'https://firebasestorage.googleapis.com/v0/b/proj/o/users%2Fuid%2Fphotos%2Fremembered.jpg?alt=media';

      offlineStorageMock.getBirthdays.and.resolveTo([
        { id: '1', rememberPhoto: remUrl } as never,
      ]);

      const stMock = jasmine.createSpyObj('st', ['ref', 'listAll', 'deleteObject']);
      stMock.ref.and.returnValue({});
      stMock.listAll.and.resolveTo({ items: [rememberedRef] });
      stMock.deleteObject.and.resolveTo();

      spyOn(storageGetters, 'initFirebase').and.resolveTo();
      spyOn(storageGetters, 'getFirebaseStorage').and.returnValue({} as never);
      spyOn(storageGetters, 'getStorageModule').and.returnValue(stMock);

      await service.cleanupOrphans('uid');

      expect(stMock.deleteObject).not.toHaveBeenCalled();
    });

    it('logs a warning and continues when deleting an individual orphan fails', async () => {
      setup({ firebase: VALID_FIREBASE_OPTIONS });
      spyOn(service as unknown as { isDevEnvironment(): boolean }, 'isDevEnvironment').and.returnValue(false);

      const orphanRef = { fullPath: 'users/uid/photos/orphan.jpg' };
      const stMock = jasmine.createSpyObj('st', ['ref', 'listAll', 'deleteObject']);
      stMock.ref.and.returnValue({});
      stMock.listAll.and.resolveTo({ items: [orphanRef] });
      stMock.deleteObject.and.rejectWith(new Error('Permission denied'));

      spyOn(storageGetters, 'initFirebase').and.resolveTo();
      spyOn(storageGetters, 'getFirebaseStorage').and.returnValue({} as never);
      spyOn(storageGetters, 'getStorageModule').and.returnValue(stMock);

      await service.cleanupOrphans('uid');

      expect(loggerMock.warn).toHaveBeenCalledWith(
        '[OrphanCleanup] Could not delete orphan:',
        orphanRef.fullPath,
        jasmine.any(Error)
      );
      // Summary log still fires; cleanup is considered done even with partial failures
      expect(loggerMock.info).toHaveBeenCalledWith(
        jasmine.stringContaining('[OrphanCleanup] Complete')
      );
    });

    it('logs a warning and does not throw when listAll rejects', async () => {
      setup({ firebase: VALID_FIREBASE_OPTIONS });
      spyOn(service as unknown as { isDevEnvironment(): boolean }, 'isDevEnvironment').and.returnValue(false);

      const stMock = jasmine.createSpyObj('st', ['ref', 'listAll', 'deleteObject']);
      stMock.ref.and.returnValue({});
      stMock.listAll.and.rejectWith(new Error('Network error'));

      spyOn(storageGetters, 'initFirebase').and.resolveTo();
      spyOn(storageGetters, 'getFirebaseStorage').and.returnValue({} as never);
      spyOn(storageGetters, 'getStorageModule').and.returnValue(stMock);

      await expectAsync(service.cleanupOrphans('uid')).toBeResolved();
      expect(loggerMock.warn).toHaveBeenCalledWith(
        '[OrphanCleanup] Aborted:',
        jasmine.any(Error)
      );
    });

    it('logs a summary with counts after a mixed delete run', async () => {
      setup({ firebase: VALID_FIREBASE_OPTIONS });
      spyOn(service as unknown as { isDevEnvironment(): boolean }, 'isDevEnvironment').and.returnValue(false);

      const orphan1 = { fullPath: 'users/uid/photos/a.jpg' };
      const orphan2 = { fullPath: 'users/uid/photos/b.jpg' };
      const stMock = jasmine.createSpyObj('st', ['ref', 'listAll', 'deleteObject']);
      stMock.ref.and.returnValue({});
      stMock.listAll.and.resolveTo({ items: [orphan1, orphan2] });
      // First succeeds, second fails
      stMock.deleteObject.and.returnValues(
        Promise.resolve(),
        Promise.reject(new Error('quota'))
      );

      spyOn(storageGetters, 'initFirebase').and.resolveTo();
      spyOn(storageGetters, 'getFirebaseStorage').and.returnValue({} as never);
      spyOn(storageGetters, 'getStorageModule').and.returnValue(stMock);

      await service.cleanupOrphans('uid');

      expect(loggerMock.info).toHaveBeenCalledWith(
        jasmine.stringContaining('deleted: 1, failed: 1, scanned: 2')
      );
    });
  });
});
