import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

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
  let loggerMock: jasmine.SpyObj<LoggerService>;
  let idbConnectionMock: jasmine.SpyObj<IndexedDBConnectionService>;
  let pendingChangesMock: jasmine.SpyObj<PendingChangesService>;
  let errorReportingMock: jasmine.SpyObj<ErrorReportingService>;
  let secureStorageMock: jasmine.SpyObj<SecureStorageService>;
  let categoryStorageMock: jasmine.SpyObj<CategoryStorageService>;

  function setup(opts: { platform?: string; firebase?: object | undefined } = {}): void {
    loggerMock = jasmine.createSpyObj<LoggerService>('LoggerService', ['info', 'warn', 'error']);

    idbConnectionMock = jasmine.createSpyObj<IndexedDBConnectionService>('IndexedDBConnectionService', [
      'clearAllStores',
    ]);
    idbConnectionMock.clearAllStores.and.resolveTo(undefined);

    pendingChangesMock = jasmine.createSpyObj<PendingChangesService>('PendingChangesService', ['clearAll']);
    pendingChangesMock.clearAll.and.resolveTo(undefined);

    errorReportingMock = jasmine.createSpyObj<ErrorReportingService>('ErrorReportingService', ['clearErrors']);
    errorReportingMock.clearErrors.and.resolveTo(undefined);

    secureStorageMock = jasmine.createSpyObj<SecureStorageService>('SecureStorageService', ['clearEncryptionKey']);
    secureStorageMock.clearEncryptionKey.and.resolveTo(undefined);

    categoryStorageMock = jasmine.createSpyObj<CategoryStorageService>('CategoryStorageService', ['clearAll']);

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
      await expectAsync(
        firstValueFrom(service.deleteAccount('user-123'))
      ).toBeRejectedWithError('Not available server-side');
    });
  });

  describe('Firebase not configured', () => {
    it('should reject with "Firebase not configured" when FIREBASE_OPTIONS is undefined', async () => {
      setup({ firebase: undefined });
      await expectAsync(
        firstValueFrom(service.deleteAccount('user-123'))
      ).toBeRejectedWithError('Firebase not configured');
    });
  });

  describe('Firebase configured — SDK not loaded (all getters return null)', () => {
    beforeEach(() => setup({ firebase: VALID_FIREBASE_OPTIONS }));

    it('should resolve and still wipe all local data when Firebase SDK getters return null', async () => {
      spyOn(firebaseConfig.firebaseGetters, 'getFirebaseFirestore').and.returnValue(null);
      spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').and.returnValue(null);
      spyOn(firebaseConfig.storageGetters, 'getFirebaseStorage').and.returnValue(null);
      spyOn(firebaseConfig.storageGetters, 'getStorageModule').and.returnValue(null);

      await expectAsync(
        firstValueFrom(service.deleteAccount('user-123'))
      ).toBeResolved();

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
      const fsBatchSpy = jasmine.createSpy('writeBatch');
      const fsModule = {
        getDocs: jasmine.createSpy().and.resolveTo(emptySnapshot),
        collection: jasmine.createSpy().and.returnValue({}),
        doc: jasmine.createSpy().and.returnValue({}),
        deleteDoc: jasmine.createSpy().and.resolveTo(undefined),
        writeBatch: fsBatchSpy,
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>;

      spyOn(firebaseConfig.firebaseGetters, 'getFirebaseFirestore').and.returnValue(
        {} as ReturnType<typeof firebaseConfig.firebaseGetters.getFirebaseFirestore>
      );
      spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').and.returnValue(fsModule);
      spyOn(firebaseConfig.storageGetters, 'getFirebaseStorage').and.returnValue(null);
      spyOn(firebaseConfig.storageGetters, 'getStorageModule').and.returnValue(null);

      await firstValueFrom(service.deleteAccount('user-123'));

      expect(fsBatchSpy).not.toHaveBeenCalled();
      expect(idbConnectionMock.clearAllStores).toHaveBeenCalledTimes(1);
      expect(loggerMock.info).toHaveBeenCalledWith(
        '[AccountDeletion] Firestore data removed for user:',
        'user-123'
      );
    });

    it('should batch-delete Firestore documents when collections have data', async () => {
      const mockDoc = { ref: {} };
      const fullSnapshot = { empty: false, docs: [mockDoc, mockDoc] };
      const mockBatch = {
        delete: jasmine.createSpy(),
        commit: jasmine.createSpy().and.resolveTo(undefined),
      };
      const fsModule = {
        getDocs: jasmine.createSpy().and.resolveTo(fullSnapshot),
        collection: jasmine.createSpy().and.returnValue({}),
        doc: jasmine.createSpy().and.returnValue({}),
        deleteDoc: jasmine.createSpy().and.resolveTo(undefined),
        writeBatch: jasmine.createSpy().and.returnValue(mockBatch),
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>;

      spyOn(firebaseConfig.firebaseGetters, 'getFirebaseFirestore').and.returnValue(
        {} as ReturnType<typeof firebaseConfig.firebaseGetters.getFirebaseFirestore>
      );
      spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').and.returnValue(fsModule);
      spyOn(firebaseConfig.storageGetters, 'getFirebaseStorage').and.returnValue(null);
      spyOn(firebaseConfig.storageGetters, 'getStorageModule').and.returnValue(null);

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

      const listAll = jasmine.createSpy('listAll').and.callFake((ref: unknown) => {
        if (ref === photoPrefix) return Promise.resolve({ items: [photoItem] });
        if (ref === rememberPrefix) return Promise.resolve({ items: [rememberItem] });
        return Promise.resolve({ prefixes: [photoPrefix, rememberPrefix], items: [] });
      });
      const storageModule = {
        ref: jasmine.createSpy().and.returnValue({}),
        listAll,
        deleteObject: jasmine.createSpy().and.resolveTo(undefined),
      } as unknown as ReturnType<typeof firebaseConfig.storageGetters.getStorageModule>;

      spyOn(firebaseConfig.firebaseGetters, 'getFirebaseFirestore').and.returnValue(null);
      spyOn(firebaseConfig.storageGetters, 'getFirebaseStorage').and.returnValue(
        {} as ReturnType<typeof firebaseConfig.storageGetters.getFirebaseStorage>
      );
      spyOn(firebaseConfig.storageGetters, 'getStorageModule').and.returnValue(storageModule);

      await firstValueFrom(service.deleteAccount('user-123'));

      expect(storageModule!.deleteObject).toHaveBeenCalledWith(jasmine.objectContaining(photoItem));
      expect(storageModule!.deleteObject).toHaveBeenCalledWith(jasmine.objectContaining(rememberItem));
      expect(loggerMock.info).toHaveBeenCalledWith(
        jasmine.stringContaining('[AccountDeletion] Removed'),
        'user-123'
      );
    });

    it('should delete root-level items when no subfolders are returned', async () => {
      const mockItem = {};
      const storageModule = {
        ref: jasmine.createSpy().and.returnValue({}),
        listAll: jasmine.createSpy().and.resolveTo({ items: [mockItem, mockItem] }),
        deleteObject: jasmine.createSpy().and.resolveTo(undefined),
      } as unknown as ReturnType<typeof firebaseConfig.storageGetters.getStorageModule>;

      spyOn(firebaseConfig.firebaseGetters, 'getFirebaseFirestore').and.returnValue(null);
      spyOn(firebaseConfig.storageGetters, 'getFirebaseStorage').and.returnValue(
        {} as ReturnType<typeof firebaseConfig.storageGetters.getFirebaseStorage>
      );
      spyOn(firebaseConfig.storageGetters, 'getStorageModule').and.returnValue(storageModule);

      await firstValueFrom(service.deleteAccount('user-123'));

      expect(storageModule!.deleteObject).toHaveBeenCalledTimes(2);
    });

    it('should log a warning and continue when Storage cleanup throws', async () => {
      const storageModule = {
        ref: jasmine.createSpy().and.returnValue({}),
        listAll: jasmine.createSpy().and.rejectWith(new Error('Storage error')),
        deleteObject: jasmine.createSpy(),
      } as unknown as ReturnType<typeof firebaseConfig.storageGetters.getStorageModule>;

      spyOn(firebaseConfig.firebaseGetters, 'getFirebaseFirestore').and.returnValue(null);
      spyOn(firebaseConfig.storageGetters, 'getFirebaseStorage').and.returnValue(
        {} as ReturnType<typeof firebaseConfig.storageGetters.getFirebaseStorage>
      );
      spyOn(firebaseConfig.storageGetters, 'getStorageModule').and.returnValue(storageModule);

      await expectAsync(
        firstValueFrom(service.deleteAccount('user-123'))
      ).toBeResolved();

      expect(loggerMock.warn).toHaveBeenCalledWith(
        '[AccountDeletion] Storage cleanup error (non-fatal):',
        jasmine.any(Error)
      );
      expect(idbConnectionMock.clearAllStores).toHaveBeenCalledTimes(1);
    });
  });

  describe('Local data deletion', () => {
    beforeEach(() => setup({ firebase: VALID_FIREBASE_OPTIONS }));

    it('should wipe IndexedDB, pending sync queue, error reports, encryption key and category cache', async () => {
      spyOn(firebaseConfig.firebaseGetters, 'getFirebaseFirestore').and.returnValue(null);
      spyOn(firebaseConfig.storageGetters, 'getFirebaseStorage').and.returnValue(null);

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
