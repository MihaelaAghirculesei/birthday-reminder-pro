import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { CloudSyncService } from './cloud-sync.service';
import { FirebaseAuthService, AuthUser } from './firebase-auth.service';
import { FirestoreService } from './firestore.service';
import { IndexedDBStorageService } from './offline-storage.service';
import { NetworkService } from './network.service';
import { LoggerService } from './logger.service';
import { BirthdayMergeService, MergeResult } from './birthday-merge.service';
import { provideTranslateTesting } from '../../testing/translate-testing';
import * as SyncActions from '../store/sync/sync.actions';
import { of, Subject, throwError } from 'rxjs';
import { Birthday } from '../../shared/models/birthday.model';

describe('CloudSyncService', () => {
  let service: CloudSyncService;
  let store: MockStore;
  let authServiceMock: jasmine.SpyObj<FirebaseAuthService>;
  let firestoreServiceMock: jasmine.SpyObj<FirestoreService>;
  let offlineStorageMock: jasmine.SpyObj<IndexedDBStorageService>;
  let networkServiceMock: Partial<NetworkService>;
  let loggerMock: jasmine.SpyObj<LoggerService>;
  let mergeServiceMock: jasmine.SpyObj<BirthdayMergeService>;

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
    authServiceMock = jasmine.createSpyObj('FirebaseAuthService', [], {
      currentUser: null,
      isAuthenticated: false
    });
    firestoreServiceMock = jasmine.createSpyObj('FirestoreService', [
      'subscribeToBirthdays', 'subscribeToCategories', 'unsubscribeAll',
      'getBirthdays', 'saveBirthdaysBatch', 'saveBirthday', 'deleteBirthday',
      'saveCategory', 'deleteCategory'
    ], {
      birthdays$: new Subject(),
      categories$: new Subject()
    });
    offlineStorageMock = jasmine.createSpyObj('IndexedDBStorageService', [
      'getBirthdays', 'saveBirthdays'
    ]);
    networkServiceMock = { isOnline: true } as Partial<NetworkService>;
    loggerMock = jasmine.createSpyObj('LoggerService', ['log', 'info', 'warn', 'error']);
    mergeServiceMock = jasmine.createSpyObj('BirthdayMergeService', ['merge']);
    mergeServiceMock.merge.and.returnValue({ merged: [], toUpload: [] } as MergeResult);

    offlineStorageMock.getBirthdays.and.returnValue(Promise.resolve([]));
    offlineStorageMock.saveBirthdays.and.returnValue(Promise.resolve());
    firestoreServiceMock.saveBirthdaysBatch.and.returnValue(of(undefined));

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

  describe('setupListeners / teardownListeners', () => {
    it('setupListeners should subscribe to birthdays and categories in Firestore', () => {
      service.setupListeners('user-123');
      expect(firestoreServiceMock.subscribeToBirthdays).toHaveBeenCalledWith('user-123');
      expect(firestoreServiceMock.subscribeToCategories).toHaveBeenCalledWith('user-123');
    });

    it('setupListeners should dispatch cloudBirthdaysUpdated when birthdays$ emits', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      const birthdays$ = new Subject<Birthday[]>();
      Object.defineProperty(firestoreServiceMock, 'birthdays$', { get: () => birthdays$ });

      service.setupListeners('user-123');

      const birthdays = [makeBirthday()];
      birthdays$.next(birthdays);

      expect(dispatchSpy).toHaveBeenCalledWith(SyncActions.cloudBirthdaysUpdated({ birthdays }));
    });

    it('setupListeners should dispatch cloudCategoriesUpdated when categories$ emits', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      const categories$ = new Subject<unknown[]>();
      Object.defineProperty(firestoreServiceMock, 'categories$', { get: () => categories$ });

      service.setupListeners('user-123');

      const categories = [{ id: 'cat-1', name: 'Family' }];
      categories$.next(categories);

      expect(dispatchSpy).toHaveBeenCalledWith(
        SyncActions.cloudCategoriesUpdated({ categories: categories as never[] })
      );
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
      firestoreServiceMock.getBirthdays.and.returnValue(of([]));
      offlineStorageMock.getBirthdays.and.returnValue(Promise.resolve([makeBirthday()]));
      const dispatchSpy = spyOn(store, 'dispatch');

      await service.checkForMigration('user-123');

      expect(dispatchSpy).toHaveBeenCalledWith(SyncActions.migrateLocalToCloud());
    });

    it('should merge when cloud data exists', async () => {
      const cloudBirthdays = [makeBirthday({ id: 'cloud-1' })];
      firestoreServiceMock.getBirthdays.and.returnValue(of(cloudBirthdays));

      const mergeSpy = spyOn(service, 'mergeCloudWithLocal').and.returnValue(Promise.resolve());

      await service.checkForMigration('user-123');

      expect(mergeSpy).toHaveBeenCalledWith(cloudBirthdays, 'user-123');
    });

    it('should not dispatch migrateLocalToCloud when both cloud and local are empty', async () => {
      firestoreServiceMock.getBirthdays.and.returnValue(of([]));
      offlineStorageMock.getBirthdays.and.returnValue(Promise.resolve([]));
      const dispatchSpy = spyOn(store, 'dispatch');

      await service.checkForMigration('user-123');

      expect(dispatchSpy).not.toHaveBeenCalled();
    });

    it('should catch and log errors gracefully', async () => {
      firestoreServiceMock.getBirthdays.and.returnValue(
        throwError(() => new Error('Network error'))
      );

      await expectAsync(service.checkForMigration('user-123')).toBeResolved();
      expect(loggerMock.error).toHaveBeenCalledWith('[CloudSync] Migration check failed:', jasmine.any(Error));
    });
  });

  describe('mergeCloudWithLocal', () => {
    it('should call mergeService.merge with latest-wins strategy', async () => {
      const cloudBirthdays = [makeBirthday({ id: 'cloud-1', name: 'Cloud Only' })];
      const localBirthdays = [makeBirthday({ id: 'local-1', name: 'Local Only' })];
      offlineStorageMock.getBirthdays.and.returnValue(Promise.resolve(localBirthdays));
      mergeServiceMock.merge.and.returnValue({ merged: [...cloudBirthdays, ...localBirthdays], toUpload: [] });

      await service.mergeCloudWithLocal(cloudBirthdays, 'user-123');

      expect(mergeServiceMock.merge).toHaveBeenCalledWith(
        localBirthdays,
        cloudBirthdays,
        { strategy: 'latest-wins' }
      );
    });

    it('should save merged result to IndexedDB', async () => {
      const mergedBirthdays = [makeBirthday({ id: 'b-1', name: 'Merged' })];
      offlineStorageMock.getBirthdays.and.returnValue(Promise.resolve([]));
      mergeServiceMock.merge.and.returnValue({ merged: mergedBirthdays, toUpload: [] });

      await service.mergeCloudWithLocal([], 'user-123');

      expect(offlineStorageMock.saveBirthdays).toHaveBeenCalledWith(mergedBirthdays);
    });

    it('should upload toUpload items to cloud when online', async () => {
      const toUploadItems = [makeBirthday({ id: 'local-1' })];
      mergeServiceMock.merge.and.returnValue({ merged: toUploadItems, toUpload: toUploadItems });
      Object.defineProperty(networkServiceMock, 'isOnline', { get: () => true });

      await service.mergeCloudWithLocal([], 'user-123');

      expect(firestoreServiceMock.saveBirthdaysBatch).toHaveBeenCalledWith('user-123', toUploadItems);
    });

    it('should not upload when offline', async () => {
      const toUploadItems = [makeBirthday({ id: 'local-1' })];
      mergeServiceMock.merge.and.returnValue({ merged: toUploadItems, toUpload: toUploadItems });
      Object.defineProperty(networkServiceMock, 'isOnline', { get: () => false });

      await service.mergeCloudWithLocal([], 'user-123');

      expect(firestoreServiceMock.saveBirthdaysBatch).not.toHaveBeenCalled();
    });

    it('should not upload when toUpload is empty', async () => {
      mergeServiceMock.merge.and.returnValue({ merged: [], toUpload: [] });

      await service.mergeCloudWithLocal([], 'user-123');

      expect(firestoreServiceMock.saveBirthdaysBatch).not.toHaveBeenCalled();
    });

    it('should dispatch syncSuccess after merge', async () => {
      mergeServiceMock.merge.and.returnValue({ merged: [], toUpload: [] });
      spyOn(store, 'dispatch');

      await service.mergeCloudWithLocal([], 'user-123');

      expect(store.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({ type: '[Sync] Success' })
      );
    });
  });

  describe('migrateLocalToCloud', () => {
    it('should throw when user is not authenticated', async () => {
      try {
        await service.migrateLocalToCloud();
        fail('Should have thrown');
      } catch (err: unknown) {
        expect((err as Error).message).toBe('User not authenticated');
      }
    });

    it('should return 0 when no local data', async () => {
      Object.defineProperty(authServiceMock, 'currentUser', { get: () => mockUser });
      offlineStorageMock.getBirthdays.and.returnValue(Promise.resolve([]));

      const count = await service.migrateLocalToCloud();
      expect(count).toBe(0);
    });

    it('should upload local birthdays with sync metadata', async () => {
      Object.defineProperty(authServiceMock, 'currentUser', { get: () => mockUser });
      offlineStorageMock.getBirthdays.and.returnValue(Promise.resolve([makeBirthday({ id: 'b-1' })]));

      const count = await service.migrateLocalToCloud();

      expect(count).toBe(1);
      expect(firestoreServiceMock.saveBirthdaysBatch).toHaveBeenCalled();
      const uploaded = firestoreServiceMock.saveBirthdaysBatch.calls.mostRecent().args[1];
      expect(uploaded[0].ownerId).toBe('user-123');
      expect(uploaded[0].syncStatus).toBe('synced');
      expect(uploaded[0].updatedAt).toBeDefined();
    });

    it('should update local storage with sync metadata after upload', async () => {
      Object.defineProperty(authServiceMock, 'currentUser', { get: () => mockUser });
      offlineStorageMock.getBirthdays.and.returnValue(Promise.resolve([makeBirthday({ id: 'b-1' })]));

      await service.migrateLocalToCloud();

      const saved = offlineStorageMock.saveBirthdays.calls.mostRecent().args[0];
      expect(saved[0].syncStatus).toBe('synced');
    });

    it('should migrate multiple birthdays', async () => {
      Object.defineProperty(authServiceMock, 'currentUser', { get: () => mockUser });
      offlineStorageMock.getBirthdays.and.returnValue(Promise.resolve([
        makeBirthday({ id: 'b-1' }),
        makeBirthday({ id: 'b-2' }),
        makeBirthday({ id: 'b-3' })
      ]));

      const count = await service.migrateLocalToCloud();
      expect(count).toBe(3);
    });

    it('should preserve existing updatedAt during migration', async () => {
      Object.defineProperty(authServiceMock, 'currentUser', { get: () => mockUser });
      const existingTimestamp = 1700000000000;
      offlineStorageMock.getBirthdays.and.returnValue(
        Promise.resolve([makeBirthday({ id: 'b-1', updatedAt: existingTimestamp })])
      );

      await service.migrateLocalToCloud();

      const uploaded = firestoreServiceMock.saveBirthdaysBatch.calls.mostRecent().args[1];
      expect(uploaded[0].updatedAt).toBe(existingTimestamp);
    });
  });
});
