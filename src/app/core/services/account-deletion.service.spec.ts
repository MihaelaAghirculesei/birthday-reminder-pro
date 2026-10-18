import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import type { MockedObject } from 'vitest';

import * as firebaseConfig from '../../firebase.config';
import { FIREBASE_OPTIONS } from '../../firebase.config';
import { AccountDeletionService } from './account-deletion.service';
import { CategoryStorageService } from './category-storage.service';
import { ErrorReportingService } from './error-reporting.service';
import { IndexedDBConnectionService } from './indexeddb-connection.service';
import { LoggerService, SILENT_LOGGER_PROVIDER } from './logger.service';
import { PendingChangesService } from './pending-changes.service';
import { SecureStorageService } from './secure-storage.service';

const VALID_FIREBASE_OPTIONS = { apiKey: 'test-key', projectId: 'test-project' };

describe('AccountDeletionService', () => {
  let service: AccountDeletionService;
  let loggerMock: MockedObject<LoggerService>;
  let idbConnectionMock: MockedObject<IndexedDBConnectionService>;
  let pendingChangesMock: MockedObject<PendingChangesService>;
  let errorReportingMock: MockedObject<ErrorReportingService>;
  let secureStorageMock: MockedObject<SecureStorageService>;
  let categoryStorageMock: MockedObject<CategoryStorageService>;

  function setup(opts: {
    platform?: string;
    firebase?: object | undefined;
  } = {}): void {
    loggerMock = {
      info: vi.fn().mockName('LoggerService.info'),
      warn: vi.fn().mockName('LoggerService.warn'),
      error: vi.fn().mockName('LoggerService.error')
    } as unknown as MockedObject<LoggerService>;

    idbConnectionMock = {
      clearAllStores: vi.fn().mockName('IndexedDBConnectionService.clearAllStores')
    } as unknown as MockedObject<IndexedDBConnectionService>;
    idbConnectionMock.clearAllStores.mockResolvedValue(undefined);

    pendingChangesMock = {
      clearAll: vi.fn().mockName('PendingChangesService.clearAll')
    } as unknown as MockedObject<PendingChangesService>;
    pendingChangesMock.clearAll.mockResolvedValue(undefined);

    errorReportingMock = {
      clearErrors: vi.fn().mockName('ErrorReportingService.clearErrors')
    } as unknown as MockedObject<ErrorReportingService>;
    errorReportingMock.clearErrors.mockResolvedValue(undefined);

    secureStorageMock = {
      clearEncryptionKey: vi.fn().mockName('SecureStorageService.clearEncryptionKey')
    } as unknown as MockedObject<SecureStorageService>;
    secureStorageMock.clearEncryptionKey.mockResolvedValue(undefined);

    categoryStorageMock = {
      clearAll: vi.fn().mockName('CategoryStorageService.clearAll')
    } as unknown as MockedObject<CategoryStorageService>;

    TestBed.configureTestingModule({
      providers: [
        { provide: LoggerService, useValue: loggerMock },
        { provide: IndexedDBConnectionService, useValue: idbConnectionMock },
        { provide: PendingChangesService, useValue: pendingChangesMock },
        { provide: ErrorReportingService, useValue: errorReportingMock },
        { provide: SecureStorageService, useValue: secureStorageMock },
        { provide: CategoryStorageService, useValue: categoryStorageMock },
        { provide: FIREBASE_OPTIONS, useValue: opts.firebase ?? undefined },
        { provide: PLATFORM_ID, useValue: opts.platform ?? 'browser' },
      ],
    });

    service = TestBed.inject(AccountDeletionService);
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    setup();
    expect(service).toBeTruthy();
  });

  describe('server-side guard', () => {
    it('should reject with "Not available server-side" on server platform', async () => {
      setup({ platform: 'server', firebase: VALID_FIREBASE_OPTIONS });
      await expect(firstValueFrom(service.deleteAccount('user-123'))).rejects.toThrowError('Not available server-side');
    });
  });

  describe('Firebase not configured', () => {
    it('should reject with "Firebase not configured" when FIREBASE_OPTIONS is undefined', async () => {
      setup({ firebase: undefined });
      await expect(firstValueFrom(service.deleteAccount('user-123'))).rejects.toThrowError('Firebase not configured');
    });
  });

  describe('Firebase configured — SDK not loaded (all getters return null)', () => {
    beforeEach(() => setup({ firebase: VALID_FIREBASE_OPTIONS }));

    it('should resolve and still wipe all local data when Firebase SDK getters return null', async () => {
      vi.spyOn(firebaseConfig.firebaseGetters, 'getFirebaseFirestore').mockReturnValue(null);
      vi.spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').mockReturnValue(null);
      vi.spyOn(firebaseConfig.storageGetters, 'getFirebaseStorage').mockReturnValue(null);
      vi.spyOn(firebaseConfig.storageGetters, 'getStorageModule').mockReturnValue(null);

      await expect(firstValueFrom(service.deleteAccount('user-123'))).resolves.not.toThrow();

      expect(idbConnectionMock.clearAllStores).toHaveBeenCalledTimes(1);
      expect(pendingChangesMock.clearAll).toHaveBeenCalledTimes(1);
      expect(errorReportingMock.clearErrors).toHaveBeenCalledTimes(1);
      expect(secureStorageMock.clearEncryptionKey).toHaveBeenCalledTimes(1);
      expect(categoryStorageMock.clearAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('Firestore data deletion', () => {
    beforeEach(() => setup({ firebase: VALID_FIREBASE_OPTIONS }));

    it('should skip batch deletion when collections are empty', async () => {
      const emptySnapshot = { empty: true, docs: [] };
      const fsBatchSpy = vi.fn();
      const fsModule = {
        getDocs: vi.fn().mockResolvedValue(emptySnapshot),
        collection: vi.fn().mockReturnValue({}),
        doc: vi.fn().mockReturnValue({}),
        deleteDoc: vi.fn().mockResolvedValue(undefined),
        writeBatch: fsBatchSpy,
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>;

      vi.spyOn(firebaseConfig.firebaseGetters, 'getFirebaseFirestore').mockReturnValue({} as ReturnType<typeof firebaseConfig.firebaseGetters.getFirebaseFirestore>);
      vi.spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').mockReturnValue(fsModule);
      vi.spyOn(firebaseConfig.storageGetters, 'getFirebaseStorage').mockReturnValue(null);
      vi.spyOn(firebaseConfig.storageGetters, 'getStorageModule').mockReturnValue(null);

      await firstValueFrom(service.deleteAccount('user-123'));

      expect(fsBatchSpy).not.toHaveBeenCalled();
      expect(idbConnectionMock.clearAllStores).toHaveBeenCalledTimes(1);
      expect(loggerMock.info).toHaveBeenCalledWith('[AccountDeletion] Firestore data removed for user:', 'user-123');
    });

    it('should batch-delete Firestore documents when collections have data', async () => {
      const mockDoc = { ref: {} };
      const fullSnapshot = { empty: false, docs: [mockDoc, mockDoc] };
      const mockBatch = {
        delete: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      };
      const fsModule = {
        getDocs: vi.fn().mockResolvedValue(fullSnapshot),
        collection: vi.fn().mockReturnValue({}),
        doc: vi.fn().mockReturnValue({}),
        deleteDoc: vi.fn().mockResolvedValue(undefined),
        writeBatch: vi.fn().mockReturnValue(mockBatch),
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>;

      vi.spyOn(firebaseConfig.firebaseGetters, 'getFirebaseFirestore').mockReturnValue({} as ReturnType<typeof firebaseConfig.firebaseGetters.getFirebaseFirestore>);
      vi.spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').mockReturnValue(fsModule);
      vi.spyOn(firebaseConfig.storageGetters, 'getFirebaseStorage').mockReturnValue(null);
      vi.spyOn(firebaseConfig.storageGetters, 'getStorageModule').mockReturnValue(null);

      await firstValueFrom(service.deleteAccount('user-123'));

      expect(mockBatch.delete).toHaveBeenCalled();
      expect(mockBatch.commit).toHaveBeenCalled();
      expect(idbConnectionMock.clearAllStores).toHaveBeenCalledTimes(1);
    });
  });

  describe('Storage file deletion', () => {
    beforeEach(() => setup({ firebase: VALID_FIREBASE_OPTIONS }));

    it('should delete files nested under the photo/ and rememberPhoto/ subfolders', async () => {
      const photoPrefix = { name: 'photo' };
      const rememberPrefix = { name: 'rememberPhoto' };
      const photoItem = { fullPath: 'users/user-123/photo/1.jpg' };
      const rememberItem = { fullPath: 'users/user-123/rememberPhoto/2.jpg' };

      const listAll = vi.fn().mockImplementation((ref: unknown) => {
        if (ref === photoPrefix)
          return Promise.resolve({ items: [photoItem] });
        if (ref === rememberPrefix)
          return Promise.resolve({ items: [rememberItem] });
        return Promise.resolve({ prefixes: [photoPrefix, rememberPrefix], items: [] });
      });
      const storageModule = {
        ref: vi.fn().mockReturnValue({}),
        listAll,
        deleteObject: vi.fn().mockResolvedValue(undefined),
      } as unknown as ReturnType<typeof firebaseConfig.storageGetters.getStorageModule>;

      vi.spyOn(firebaseConfig.firebaseGetters, 'getFirebaseFirestore').mockReturnValue(null);
      vi.spyOn(firebaseConfig.storageGetters, 'getFirebaseStorage').mockReturnValue({} as ReturnType<typeof firebaseConfig.storageGetters.getFirebaseStorage>);
      vi.spyOn(firebaseConfig.storageGetters, 'getStorageModule').mockReturnValue(storageModule);

      await firstValueFrom(service.deleteAccount('user-123'));

      expect(storageModule!.deleteObject).toHaveBeenCalledWith(expect.objectContaining(photoItem));
      expect(storageModule!.deleteObject).toHaveBeenCalledWith(expect.objectContaining(rememberItem));
      expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('[AccountDeletion] Removed'), 'user-123');
    });

    it('should delete root-level items when no subfolders are returned', async () => {
      const mockItem = {};
      const storageModule = {
        ref: vi.fn().mockReturnValue({}),
        listAll: vi.fn().mockResolvedValue({ items: [mockItem, mockItem] }),
        deleteObject: vi.fn().mockResolvedValue(undefined),
      } as unknown as ReturnType<typeof firebaseConfig.storageGetters.getStorageModule>;

      vi.spyOn(firebaseConfig.firebaseGetters, 'getFirebaseFirestore').mockReturnValue(null);
      vi.spyOn(firebaseConfig.storageGetters, 'getFirebaseStorage').mockReturnValue({} as ReturnType<typeof firebaseConfig.storageGetters.getFirebaseStorage>);
      vi.spyOn(firebaseConfig.storageGetters, 'getStorageModule').mockReturnValue(storageModule);

      await firstValueFrom(service.deleteAccount('user-123'));

      expect(storageModule!.deleteObject).toHaveBeenCalledTimes(2);
    });

    it('should log a warning and continue when Storage cleanup throws', async () => {
      const storageModule = {
        ref: vi.fn().mockReturnValue({}),
        listAll: vi.fn().mockRejectedValue(new Error('Storage error')),
        deleteObject: vi.fn(),
      } as unknown as ReturnType<typeof firebaseConfig.storageGetters.getStorageModule>;

      vi.spyOn(firebaseConfig.firebaseGetters, 'getFirebaseFirestore').mockReturnValue(null);
      vi.spyOn(firebaseConfig.storageGetters, 'getFirebaseStorage').mockReturnValue({} as ReturnType<typeof firebaseConfig.storageGetters.getFirebaseStorage>);
      vi.spyOn(firebaseConfig.storageGetters, 'getStorageModule').mockReturnValue(storageModule);

      await expect(firstValueFrom(service.deleteAccount('user-123'))).resolves.not.toThrow();

      expect(loggerMock.warn).toHaveBeenCalledWith('[AccountDeletion] Storage cleanup error (non-fatal):', expect.any(Error));
      expect(idbConnectionMock.clearAllStores).toHaveBeenCalledTimes(1);
    });
  });

  describe('Local data deletion', () => {
    beforeEach(() => setup({ firebase: VALID_FIREBASE_OPTIONS }));

    it('should wipe IndexedDB, pending sync queue, error reports, encryption key and category cache', async () => {
      vi.spyOn(firebaseConfig.firebaseGetters, 'getFirebaseFirestore').mockReturnValue(null);
      vi.spyOn(firebaseConfig.storageGetters, 'getFirebaseStorage').mockReturnValue(null);

      await firstValueFrom(service.deleteAccount('user-123'));

      expect(idbConnectionMock.clearAllStores).toHaveBeenCalledTimes(1);
      expect(pendingChangesMock.clearAll).toHaveBeenCalledTimes(1);
      expect(errorReportingMock.clearErrors).toHaveBeenCalledTimes(1);
      expect(secureStorageMock.clearEncryptionKey).toHaveBeenCalledTimes(1);
      expect(categoryStorageMock.clearAll).toHaveBeenCalledTimes(1);
    });
  });
});

describe('AccountDeletionService — logger injection', () => {
  it('should accept SILENT_LOGGER_PROVIDER', () => {
    TestBed.configureTestingModule({
      providers: [
        SILENT_LOGGER_PROVIDER,
        { provide: IndexedDBConnectionService, useValue: { clearAllStores: () => Promise.resolve() } },
        { provide: PendingChangesService, useValue: { clearAll: () => Promise.resolve() } },
        { provide: ErrorReportingService, useValue: { clearErrors: () => Promise.resolve() } },
        { provide: SecureStorageService, useValue: { clearEncryptionKey: () => Promise.resolve() } },
        { provide: CategoryStorageService, useValue: { clearAll: () => undefined } },
        { provide: FIREBASE_OPTIONS, useValue: undefined },
      ],
    });
    const service = TestBed.inject(AccountDeletionService);
    expect(service).toBeTruthy();
    TestBed.resetTestingModule();
  });
});
