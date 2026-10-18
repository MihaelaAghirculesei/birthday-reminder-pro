import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { of, Subject, throwError } from 'rxjs';
import type { MockedObject } from 'vitest';

import { type Birthday } from '../../shared/models/birthday.model';
import { provideTranslateTesting } from '../../testing/translate-testing';
import * as SyncActions from '../store/sync/sync.actions';
import { BirthdayMergeService, type MergeResult } from './birthday-merge.service';
import { CloudSyncService } from './cloud-sync.service';
import { FeatureFlagsService } from './feature-flags.service';
import { type AuthUser, FirebaseAuthService } from './firebase-auth.service';
import { FirestoreService } from './firestore.service';
import { LoggerService } from './logger.service';
import { NetworkService } from './network.service';
import { IndexedDBStorageService } from './offline-storage.service';
import { PhotoStorageService } from './photo-storage.service';

describe('CloudSyncService', () => {
  let service: CloudSyncService;
  let store: MockStore;
  let authServiceMock: MockedObject<FirebaseAuthService>;
  let firestoreServiceMock: MockedObject<FirestoreService>;
  let offlineStorageMock: MockedObject<IndexedDBStorageService>;
  let networkServiceMock: {
    isOnline: boolean;
  };
  let loggerMock: MockedObject<LoggerService>;
  let mergeServiceMock: MockedObject<BirthdayMergeService>;
  let photoStorageMock: MockedObject<PhotoStorageService>;
  let featureFlagsMock: MockedObject<FeatureFlagsService>;

  const mockUser: AuthUser = {
    uid: 'user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: null
  };

  const initialState = {
    auth: { user: null, loading: false, error: null, initialized: true },
    sync: { state: 'idle', lastSyncAt: null, pendingChanges: 0, error: null, isOnline: true }
  };

  function makeBirthday(overrides: Partial<Birthday> = {}): Birthday {
    return {
      id: 'b-1',
      name: 'Mario Rossi',
      birthDate: '1990-05-15',
      zodiacSign: 'Taurus',
      daysUntilBirthday: 90,
      ...overrides
    } as Birthday;
  }

  beforeEach(() => {
    authServiceMock = {
      currentUser: null,
      isAuthenticated: false
    } as unknown as MockedObject<FirebaseAuthService>;
    firestoreServiceMock = {
      subscribeToBirthdays: vi.fn().mockName('FirestoreService.subscribeToBirthdays'),
      subscribeToCategories: vi.fn().mockName('FirestoreService.subscribeToCategories'),
      unsubscribeAll: vi.fn().mockName('FirestoreService.unsubscribeAll'),
      getBirthdays: vi.fn().mockName('FirestoreService.getBirthdays'),
      saveBirthdaysBatch: vi.fn().mockName('FirestoreService.saveBirthdaysBatch'),
      saveBirthday: vi.fn().mockName('FirestoreService.saveBirthday'),
      deleteBirthday: vi.fn().mockName('FirestoreService.deleteBirthday'),
      saveCategory: vi.fn().mockName('FirestoreService.saveCategory'),
      deleteCategory: vi.fn().mockName('FirestoreService.deleteCategory'),
      birthdays$: new Subject(),
      categories$: new Subject()
    } as unknown as MockedObject<FirestoreService>;
    offlineStorageMock = {
      getBirthdays: vi.fn().mockName('IndexedDBStorageService.getBirthdays'),
      saveBirthdays: vi.fn().mockName('IndexedDBStorageService.saveBirthdays')
    } as unknown as MockedObject<IndexedDBStorageService>;
    networkServiceMock = { isOnline: true };
    loggerMock = {
      log: vi.fn().mockName('LoggerService.log'),
      info: vi.fn().mockName('LoggerService.info'),
      warn: vi.fn().mockName('LoggerService.warn'),
      error: vi.fn().mockName('LoggerService.error')
    } as unknown as MockedObject<LoggerService>;
    mergeServiceMock = {
      merge: vi.fn().mockName('BirthdayMergeService.merge')
    } as unknown as MockedObject<BirthdayMergeService>;
    mergeServiceMock.merge.mockReturnValue({ merged: [], toUpload: [] } as MergeResult);
    photoStorageMock = {
      isBase64: vi.fn().mockName('PhotoStorageService.isBase64'),
      migrateBase64: vi.fn().mockName('PhotoStorageService.migrateBase64'),
      deletePhotoByUrl: vi.fn().mockName('PhotoStorageService.deletePhotoByUrl'),
      uploadPhoto: vi.fn().mockName('PhotoStorageService.uploadPhoto'),
      isStorageUrl: vi.fn().mockName('PhotoStorageService.isStorageUrl'),
      fileToBase64: vi.fn().mockName('PhotoStorageService.fileToBase64')
    } as unknown as MockedObject<PhotoStorageService>;
    photoStorageMock.isBase64.mockReturnValue(false);
    photoStorageMock.migrateBase64.mockImplementation((val: string) => Promise.resolve(val));
    featureFlagsMock = {
      isCloudSyncEnabled: vi.fn().mockName('FeatureFlagsService.isCloudSyncEnabled')
    } as unknown as MockedObject<FeatureFlagsService>;
    featureFlagsMock.isCloudSyncEnabled.mockReturnValue(true);

    offlineStorageMock.getBirthdays.mockReturnValue(Promise.resolve([]));
    offlineStorageMock.saveBirthdays.mockReturnValue(Promise.resolve());
    firestoreServiceMock.saveBirthdaysBatch.mockReturnValue(of(undefined));

    TestBed.configureTestingModule({
      providers: [
        CloudSyncService,
        provideMockStore({ initialState }),
        { provide: FirebaseAuthService, useValue: authServiceMock },
        { provide: FirestoreService, useValue: firestoreServiceMock },
        { provide: IndexedDBStorageService, useValue: offlineStorageMock },
        { provide: NetworkService, useValue: networkServiceMock },
        { provide: LoggerService, useValue: loggerMock },
        { provide: BirthdayMergeService, useValue: mergeServiceMock },
        { provide: PhotoStorageService, useValue: photoStorageMock },
        { provide: FeatureFlagsService, useValue: featureFlagsMock },
        provideTranslateTesting()
      ]
    });

    service = TestBed.inject(CloudSyncService);
    store = TestBed.inject(MockStore);
  });

  afterEach(() => {
    store.resetSelectors();
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  describe('feature flag kill-switch', () => {
    beforeEach(() => {
      featureFlagsMock.isCloudSyncEnabled.mockReturnValue(false);
    });

    it('setupListeners should not subscribe to Firestore when cloud sync is disabled', () => {
      service.setupListeners('user-123');
      expect(firestoreServiceMock.subscribeToBirthdays).not.toHaveBeenCalled();
    });

    it('checkForMigration should not query Firestore when cloud sync is disabled', async () => {
      await service.checkForMigration('user-123');
      expect(firestoreServiceMock.getBirthdays).not.toHaveBeenCalled();
    });

    it('migrateLocalToCloud should return 0 without touching storage when cloud sync is disabled', async () => {
      const count = await service.migrateLocalToCloud();
      expect(count).toBe(0);
      expect(offlineStorageMock.getBirthdays).not.toHaveBeenCalled();
    });
  });

  describe('setupListeners / teardownListeners', () => {
    it('setupListeners should subscribe to birthdays and categories in Firestore', () => {
      service.setupListeners('user-123');
      expect(firestoreServiceMock.subscribeToBirthdays).toHaveBeenCalledWith('user-123');
      expect(firestoreServiceMock.subscribeToCategories).toHaveBeenCalledWith('user-123');
    });

    it('setupListeners should dispatch cloudBirthdaysUpdated when birthdays$ emits', () => {
      const dispatchSpy = vi.spyOn(store, 'dispatch');
      const birthdays$ = new Subject<Birthday[]>();
      Object.defineProperty(firestoreServiceMock, 'birthdays$', { get: () => birthdays$, configurable: true });

      service.setupListeners('user-123');

      const birthdays = [makeBirthday()];
      birthdays$.next(birthdays);

      expect(dispatchSpy).toHaveBeenCalledWith(SyncActions.cloudBirthdaysUpdated({ birthdays }));
    });

    it('setupListeners should dispatch cloudCategoriesUpdated when categories$ emits', () => {
      const dispatchSpy = vi.spyOn(store, 'dispatch');
      const categories$ = new Subject<unknown[]>();
      Object.defineProperty(firestoreServiceMock, 'categories$', { get: () => categories$, configurable: true });

      service.setupListeners('user-123');

      const categories = [{ id: 'cat-1', name: 'Family' }];
      categories$.next(categories);

      expect(dispatchSpy).toHaveBeenCalledWith(SyncActions.cloudCategoriesUpdated({ categories: categories as never[] }));
    });

    it('teardownListeners should call firestoreService.unsubscribeAll', () => {
      service.setupListeners('user-123');
      service.teardownListeners();
      expect(firestoreServiceMock.unsubscribeAll).toHaveBeenCalled();
    });

    it('teardownListeners should be idempotent when no listeners active', () => {
      service.teardownListeners();
      expect(firestoreServiceMock.unsubscribeAll).not.toHaveBeenCalled();
    });
  });

  describe('checkForMigration', () => {
    it('should dispatch migrateLocalToCloud when no cloud data and local data exists', async () => {
      firestoreServiceMock.getBirthdays.mockReturnValue(of([]));
      offlineStorageMock.getBirthdays.mockReturnValue(Promise.resolve([makeBirthday()]));
      const dispatchSpy = vi.spyOn(store, 'dispatch');

      await service.checkForMigration('user-123');

      expect(dispatchSpy).toHaveBeenCalledWith(SyncActions.migrateLocalToCloud());
    });

    it('should merge when cloud data exists', async () => {
      const cloudBirthdays = [makeBirthday({ id: 'cloud-1' })];
      firestoreServiceMock.getBirthdays.mockReturnValue(of(cloudBirthdays));

      const mergeSpy = vi.spyOn(service, 'mergeCloudWithLocal').mockReturnValue(Promise.resolve());

      await service.checkForMigration('user-123');

      expect(mergeSpy).toHaveBeenCalledWith(cloudBirthdays, 'user-123');
    });

    it('should not dispatch migrateLocalToCloud when both cloud and local are empty', async () => {
      firestoreServiceMock.getBirthdays.mockReturnValue(of([]));
      offlineStorageMock.getBirthdays.mockReturnValue(Promise.resolve([]));
      const dispatchSpy = vi.spyOn(store, 'dispatch');

      await service.checkForMigration('user-123');

      expect(dispatchSpy).not.toHaveBeenCalled();
    });

    it('should catch and log errors gracefully', async () => {
      firestoreServiceMock.getBirthdays.mockReturnValue(throwError(() => new Error('Network error')));

      await expect(service.checkForMigration('user-123')).resolves.not.toThrow();
      expect(loggerMock.error).toHaveBeenCalledWith('[CloudSync] Migration check failed:', expect.any(Error));
    });

    it('should dispatch syncFailure when migration check throws', async () => {
      firestoreServiceMock.getBirthdays.mockReturnValue(throwError(() => new Error('Network error')));
      const dispatchSpy = vi.spyOn(store, 'dispatch');

      await service.checkForMigration('user-123');

      expect(dispatchSpy).toHaveBeenCalledWith(SyncActions.syncFailure({ error: 'Network error' }));
    });

    it('should dispatch syncFailure with fallback message for non-Error throws', async () => {
      firestoreServiceMock.getBirthdays.mockReturnValue(throwError(() => 'plain string error'));
      const dispatchSpy = vi.spyOn(store, 'dispatch');

      await service.checkForMigration('user-123');

      expect(dispatchSpy).toHaveBeenCalledWith(SyncActions.syncFailure({ error: 'Migration check failed' }));
    });
  });

  describe('mergeCloudWithLocal', () => {
    it('should call mergeService.merge with latest-wins strategy', async () => {
      const cloudBirthdays = [makeBirthday({ id: 'cloud-1', name: 'Cloud Only' })];
      const localBirthdays = [makeBirthday({ id: 'local-1', name: 'Local Only' })];
      offlineStorageMock.getBirthdays.mockReturnValue(Promise.resolve(localBirthdays));
      mergeServiceMock.merge.mockReturnValue({ merged: [...cloudBirthdays, ...localBirthdays], toUpload: [] });

      await service.mergeCloudWithLocal(cloudBirthdays, 'user-123');

      expect(mergeServiceMock.merge).toHaveBeenCalledWith(localBirthdays, cloudBirthdays, { strategy: 'latest-wins' });
    });

    it('should save merged result to IndexedDB', async () => {
      const mergedBirthdays = [makeBirthday({ id: 'b-1', name: 'Merged' })];
      offlineStorageMock.getBirthdays.mockReturnValue(Promise.resolve([]));
      mergeServiceMock.merge.mockReturnValue({ merged: mergedBirthdays, toUpload: [] });

      await service.mergeCloudWithLocal([], 'user-123');

      expect(offlineStorageMock.saveBirthdays).toHaveBeenCalledWith(mergedBirthdays);
    });

    it('should upload toUpload items to cloud when online', async () => {
      const toUploadItems = [makeBirthday({ id: 'local-1' })];
      mergeServiceMock.merge.mockReturnValue({ merged: toUploadItems, toUpload: toUploadItems });
      networkServiceMock.isOnline = true;

      await service.mergeCloudWithLocal([], 'user-123');

      expect(firestoreServiceMock.saveBirthdaysBatch).toHaveBeenCalledWith('user-123', toUploadItems);
    });

    it('should not upload when offline', async () => {
      const toUploadItems = [makeBirthday({ id: 'local-1' })];
      mergeServiceMock.merge.mockReturnValue({ merged: toUploadItems, toUpload: toUploadItems });
      networkServiceMock.isOnline = false;

      await service.mergeCloudWithLocal([], 'user-123');

      expect(firestoreServiceMock.saveBirthdaysBatch).not.toHaveBeenCalled();
    });

    it('should not upload when toUpload is empty', async () => {
      mergeServiceMock.merge.mockReturnValue({ merged: [], toUpload: [] });

      await service.mergeCloudWithLocal([], 'user-123');

      expect(firestoreServiceMock.saveBirthdaysBatch).not.toHaveBeenCalled();
    });

    it('should dispatch syncSuccess after merge', async () => {
      mergeServiceMock.merge.mockReturnValue({ merged: [], toUpload: [] });
      vi.spyOn(store, 'dispatch');

      await service.mergeCloudWithLocal([], 'user-123');

      expect(store.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: '[Sync] Success' }));
    });

    it('should migrate base64 photos in toUpload items before cloud upload', async () => {
      const base64Photo = 'data:image/jpeg;base64,/9j/abc';
      const storageUrl = 'https://firebasestorage.googleapis.com/v0/b/proj/o/photo.jpg?alt=media';
      const local = makeBirthday({ id: 'local-photo', photo: base64Photo, needsMigration: true });
      offlineStorageMock.getBirthdays.mockReturnValue(Promise.resolve([local]));
      mergeServiceMock.merge.mockReturnValue({ merged: [local], toUpload: [local] });
      photoStorageMock.isBase64.mockImplementation((v: string) => v.startsWith('data:image/'));
      photoStorageMock.migrateBase64.mockReturnValue(Promise.resolve(storageUrl));
      networkServiceMock.isOnline = true;

      await service.mergeCloudWithLocal([], 'user-123');

      const uploaded = vi.mocked(firestoreServiceMock.saveBirthdaysBatch).mock.lastCall![1];
      expect(uploaded[0].photo).toBe(storageUrl);
      expect(uploaded[0].needsMigration).toBe(false);
    });
  });

  describe('migrateLocalToCloud', () => {
    function setCurrentUser(user: AuthUser | null): void {
      (authServiceMock as { currentUser: AuthUser | null }).currentUser = user;
    }

    it('should throw when user is not authenticated', async () => {
      await expect(service.migrateLocalToCloud()).rejects.toThrow('User not authenticated');
    });

    it('should return 0 when no local data', async () => {
      setCurrentUser(mockUser);
      offlineStorageMock.getBirthdays.mockReturnValue(Promise.resolve([]));

      const count = await service.migrateLocalToCloud();
      expect(count).toBe(0);
    });

    it('should upload local birthdays with sync metadata', async () => {
      setCurrentUser(mockUser);
      offlineStorageMock.getBirthdays.mockReturnValue(Promise.resolve([makeBirthday({ id: 'b-1' })]));

      const count = await service.migrateLocalToCloud();

      expect(count).toBe(1);
      expect(firestoreServiceMock.saveBirthdaysBatch).toHaveBeenCalled();
      const uploaded = vi.mocked(firestoreServiceMock.saveBirthdaysBatch).mock.lastCall![1];
      expect(uploaded[0].ownerId).toBe('user-123');
      expect(uploaded[0].syncStatus).toBe('synced');
      expect(uploaded[0].updatedAt).toBeDefined();
    });

    it('should update local storage with sync metadata after upload', async () => {
      setCurrentUser(mockUser);
      offlineStorageMock.getBirthdays.mockReturnValue(Promise.resolve([makeBirthday({ id: 'b-1' })]));

      await service.migrateLocalToCloud();

      const saved = vi.mocked(offlineStorageMock.saveBirthdays).mock.lastCall![0];
      expect(saved[0].syncStatus).toBe('synced');
    });

    it('should migrate multiple birthdays', async () => {
      setCurrentUser(mockUser);
      offlineStorageMock.getBirthdays.mockReturnValue(Promise.resolve([
        makeBirthday({ id: 'b-1' }),
        makeBirthday({ id: 'b-2' }),
        makeBirthday({ id: 'b-3' })
      ]));

      const count = await service.migrateLocalToCloud();
      expect(count).toBe(3);
    });

    it('should preserve existing updatedAt during migration', async () => {
      setCurrentUser(mockUser);
      const existingTimestamp = 1700000000000;
      offlineStorageMock.getBirthdays.mockReturnValue(Promise.resolve([makeBirthday({ id: 'b-1', updatedAt: existingTimestamp })]));

      await service.migrateLocalToCloud();

      const uploaded = vi.mocked(firestoreServiceMock.saveBirthdaysBatch).mock.lastCall![1];
      expect(uploaded[0].updatedAt).toBe(existingTimestamp);
    });

    it('should migrate base64 photos to Storage before upload', async () => {
      setCurrentUser(mockUser);
      const base64Photo = 'data:image/jpeg;base64,/9j/abc';
      const storageUrl = 'https://firebasestorage.googleapis.com/v0/b/proj/o/photo.jpg?alt=media';
      const b = makeBirthday({ id: 'b-photo', photo: base64Photo, needsMigration: true });
      offlineStorageMock.getBirthdays.mockReturnValue(Promise.resolve([b]));
      photoStorageMock.isBase64.mockImplementation((v: string) => v.startsWith('data:image/'));
      photoStorageMock.migrateBase64.mockReturnValue(Promise.resolve(storageUrl));

      await service.migrateLocalToCloud();

      const uploaded = vi.mocked(firestoreServiceMock.saveBirthdaysBatch).mock.lastCall![1];
      expect(uploaded[0].photo).toBe(storageUrl);
      expect(uploaded[0].needsMigration).toBe(false);
    });

    it('should skip photo migration for birthdays without base64 photos', async () => {
      setCurrentUser(mockUser);
      const storageUrl = 'https://firebasestorage.googleapis.com/v0/b/proj/o/photo.jpg?alt=media';
      const b = makeBirthday({ id: 'b-cdn', photo: storageUrl });
      offlineStorageMock.getBirthdays.mockReturnValue(Promise.resolve([b]));

      await service.migrateLocalToCloud();

      expect(photoStorageMock.migrateBase64).not.toHaveBeenCalled();
    });

    it('should migrate base64 rememberPhoto to Storage before upload', async () => {
      setCurrentUser(mockUser);
      const base64Photo = 'data:image/jpeg;base64,/9j/abc';
      const storageUrl = 'https://firebasestorage.googleapis.com/v0/b/proj/o/remember.jpg?alt=media';
      const b = makeBirthday({ id: 'b-remember', rememberPhoto: base64Photo, needsMigration: true });
      offlineStorageMock.getBirthdays.mockReturnValue(Promise.resolve([b]));
      photoStorageMock.isBase64.mockImplementation((v: string) => v.startsWith('data:image/'));
      photoStorageMock.migrateBase64.mockReturnValue(Promise.resolve(storageUrl));

      await service.migrateLocalToCloud();

      const uploaded = vi.mocked(firestoreServiceMock.saveBirthdaysBatch).mock.lastCall![1];
      expect(uploaded[0].rememberPhoto).toBe(storageUrl);
      expect(uploaded[0].needsMigration).toBe(false);
    });
  });
});
