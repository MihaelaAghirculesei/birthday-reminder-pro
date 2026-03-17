import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { SyncCoordinatorService } from './sync-coordinator.service';
import { FirebaseAuthService, AuthUser } from './firebase-auth.service';
import { FirestoreService } from './firestore.service';
import { IndexedDBStorageService } from './offline-storage.service';
import { PendingChangesService, PendingChange } from './pending-changes.service';
import { NetworkService } from './network.service';
import { LoggerService } from './logger.service';
import { BirthdayMergeService, MergeResult } from './birthday-merge.service';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { Birthday } from '../../shared/models/birthday.model';

describe('SyncCoordinatorService', () => {
  let service: SyncCoordinatorService;
  let store: MockStore;
  let authServiceMock: jasmine.SpyObj<FirebaseAuthService>;
  let firestoreServiceMock: jasmine.SpyObj<FirestoreService>;
  let offlineStorageMock: jasmine.SpyObj<IndexedDBStorageService>;
  let pendingChangesMock: jasmine.SpyObj<PendingChangesService>;
  let networkServiceMock: Partial<NetworkService>;
  let loggerMock: jasmine.SpyObj<LoggerService>;
  let mergeServiceMock: jasmine.SpyObj<BirthdayMergeService>;
  let networkOnline$: BehaviorSubject<boolean>;

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

  function makePendingChange(overrides: Partial<PendingChange> = {}): PendingChange {
    return {
      id: 'change-1',
      entityType: 'birthday',
      entityId: 'b-1',
      changeType: 'create',
      data: makeBirthday(),
      timestamp: Date.now(),
      retryCount: 0,
      ...overrides
    };
  }

  beforeEach(() => {
    networkOnline$ = new BehaviorSubject<boolean>(true);

    authServiceMock = jasmine.createSpyObj('FirebaseAuthService', ['initAuthListener'], {
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
    pendingChangesMock = jasmine.createSpyObj('PendingChangesService', [
      'initialize', 'addChange', 'removeChange', 'markRetry', 'getChangesForEntity'
    ], {
      changes$: new BehaviorSubject<unknown[]>([]).asObservable(),
      pendingCount: 0
    });
    networkServiceMock = {
      online$: networkOnline$.asObservable(),
      isOnline: true
    } as Partial<NetworkService>;
    loggerMock = jasmine.createSpyObj('LoggerService', ['log', 'info', 'warn', 'error']);
    mergeServiceMock = jasmine.createSpyObj('BirthdayMergeService', ['merge']);
    mergeServiceMock.merge.and.returnValue({ merged: [], toUpload: [] } as MergeResult);

    pendingChangesMock.initialize.and.returnValue(Promise.resolve());
    pendingChangesMock.getChangesForEntity.and.returnValue([]);
    offlineStorageMock.getBirthdays.and.returnValue(Promise.resolve([]));

    TestBed.configureTestingModule({
      providers: [
        SyncCoordinatorService,
        provideMockStore({ initialState }),
        { provide: FirebaseAuthService, useValue: authServiceMock },
        { provide: FirestoreService, useValue: firestoreServiceMock },
        { provide: IndexedDBStorageService, useValue: offlineStorageMock },
        { provide: PendingChangesService, useValue: pendingChangesMock },
        { provide: NetworkService, useValue: networkServiceMock },
        { provide: LoggerService, useValue: loggerMock },
        { provide: BirthdayMergeService, useValue: mergeServiceMock }
      ]
    });

    service = TestBed.inject(SyncCoordinatorService);
    store = TestBed.inject(MockStore);
  });

  afterEach(() => {
    networkOnline$.complete();
    store.resetSelectors();
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('initialize should set up pending changes', async () => {
    await service.initialize();
    expect(pendingChangesMock.initialize).toHaveBeenCalled();
    expect(loggerMock.info).toHaveBeenCalledWith('[SyncCoordinator] Initialized');
  });

  it('initialize should not run twice', async () => {
    await service.initialize();
    await service.initialize();
    expect(pendingChangesMock.initialize).toHaveBeenCalledTimes(1);
  });

  it('queueChange should add change to pending', async () => {
    pendingChangesMock.addChange.and.returnValue(Promise.resolve());
    await service.queueChange('birthday', 'b-1', 'create', { name: 'Test' });
    expect(pendingChangesMock.addChange).toHaveBeenCalledWith(
      'birthday', 'b-1', 'create', { name: 'Test' }
    );
  });

  it('processPendingChanges should do nothing without user', async () => {
    await service.processPendingChanges();
    expect(pendingChangesMock.getChangesForEntity).not.toHaveBeenCalled();
  });

  it('migrateLocalToCloud should throw without user', async () => {
    try {
      await service.migrateLocalToCloud();
      fail('Should have thrown');
    } catch (err: unknown) {
      expect((err as Error).message).toBe('User not authenticated');
    }
  });

  it('migrateLocalToCloud should return 0 when no local data', async () => {
    Object.defineProperty(authServiceMock, 'currentUser', { get: () => mockUser });
    offlineStorageMock.getBirthdays.and.returnValue(Promise.resolve([]));

    const count = await service.migrateLocalToCloud();
    expect(count).toBe(0);
  });

  it('migrateLocalToCloud should upload local birthdays', async () => {
    Object.defineProperty(authServiceMock, 'currentUser', { get: () => mockUser });
    const localBirthdays = [
      { id: 'b-1', name: 'Test', birthDate: '2000-01-01' }
    ];
    offlineStorageMock.getBirthdays.and.returnValue(Promise.resolve(localBirthdays as Birthday[]));
    firestoreServiceMock.saveBirthdaysBatch.and.returnValue(of(undefined));
    offlineStorageMock.saveBirthdays.and.returnValue(Promise.resolve());

    const count = await service.migrateLocalToCloud();
    expect(count).toBe(1);
    expect(firestoreServiceMock.saveBirthdaysBatch).toHaveBeenCalled();
    expect(offlineStorageMock.saveBirthdays).toHaveBeenCalled();
  });

  it('should use DestroyRef for cleanup', () => {
    expect(service['destroyRef']).toBeTruthy();
  });

  describe('processPendingChanges', () => {
    beforeEach(() => {
      Object.defineProperty(authServiceMock, 'currentUser', { get: () => mockUser });
      Object.defineProperty(networkServiceMock, 'isOnline', { get: () => true });
    });

    it('should skip when offline', async () => {
      Object.defineProperty(networkServiceMock, 'isOnline', { get: () => false });
      await service.processPendingChanges();
      expect(pendingChangesMock.getChangesForEntity).not.toHaveBeenCalled();
    });

    it('should skip when no pending changes', async () => {
      pendingChangesMock.getChangesForEntity.and.returnValue([]);
      await service.processPendingChanges();
      expect(firestoreServiceMock.saveBirthday).not.toHaveBeenCalled();
    });

    it('should process birthday create change', async () => {
      const birthday = makeBirthday({ id: 'b-new' });
      const change = makePendingChange({
        id: 'c-1', entityId: 'b-new', changeType: 'create', data: birthday
      });
      pendingChangesMock.getChangesForEntity.and.returnValue([change]);
      firestoreServiceMock.saveBirthday.and.returnValue(of(undefined));
      pendingChangesMock.removeChange.and.returnValue(Promise.resolve());

      await service.processPendingChanges();

      expect(firestoreServiceMock.saveBirthday).toHaveBeenCalledWith('user-123', birthday);
      expect(pendingChangesMock.removeChange).toHaveBeenCalledWith('c-1');
    });

    it('should process birthday update change', async () => {
      const birthday = makeBirthday({ id: 'b-1', name: 'Updated' });
      const change = makePendingChange({
        id: 'c-2', entityId: 'b-1', changeType: 'update', data: birthday
      });
      pendingChangesMock.getChangesForEntity.and.returnValue([change]);
      firestoreServiceMock.saveBirthday.and.returnValue(of(undefined));
      pendingChangesMock.removeChange.and.returnValue(Promise.resolve());

      await service.processPendingChanges();

      expect(firestoreServiceMock.saveBirthday).toHaveBeenCalledWith('user-123', birthday);
    });

    it('should process birthday delete change', async () => {
      const change = makePendingChange({
        id: 'c-3', entityId: 'b-1', changeType: 'delete', data: null
      });
      pendingChangesMock.getChangesForEntity.and.returnValue([change]);
      firestoreServiceMock.deleteBirthday.and.returnValue(of(undefined));
      pendingChangesMock.removeChange.and.returnValue(Promise.resolve());

      await service.processPendingChanges();

      expect(firestoreServiceMock.deleteBirthday).toHaveBeenCalledWith('user-123', 'b-1');
      expect(pendingChangesMock.removeChange).toHaveBeenCalledWith('c-3');
    });

    it('should process multiple changes in order', async () => {
      const changes = [
        makePendingChange({ id: 'c-1', entityId: 'b-1', changeType: 'create' }),
        makePendingChange({ id: 'c-2', entityId: 'b-2', changeType: 'create' }),
        makePendingChange({ id: 'c-3', entityId: 'b-3', changeType: 'delete' })
      ];
      pendingChangesMock.getChangesForEntity.and.returnValue(changes);
      firestoreServiceMock.saveBirthday.and.returnValue(of(undefined));
      firestoreServiceMock.deleteBirthday.and.returnValue(of(undefined));
      pendingChangesMock.removeChange.and.returnValue(Promise.resolve());

      await service.processPendingChanges();

      expect(pendingChangesMock.removeChange).toHaveBeenCalledTimes(3);
    });

    it('should skip changes that exceeded MAX_RETRY_COUNT', async () => {
      const change = makePendingChange({
        id: 'c-1', retryCount: 3
      });
      pendingChangesMock.getChangesForEntity.and.returnValue([change]);

      await service.processPendingChanges();

      expect(firestoreServiceMock.saveBirthday).not.toHaveBeenCalled();
      expect(loggerMock.warn).toHaveBeenCalledWith(
        '[SyncCoordinator] Max retries reached for change:', 'c-1'
      );
    });

    it('should increment retry on failure', async () => {
      const change = makePendingChange({ id: 'c-1', retryCount: 1 });
      pendingChangesMock.getChangesForEntity.and.returnValue([change]);
      firestoreServiceMock.saveBirthday.and.returnValue(throwError(() => new Error('Network error')));
      pendingChangesMock.markRetry.and.returnValue(Promise.resolve());

      await service.processPendingChanges();

      expect(pendingChangesMock.markRetry).toHaveBeenCalledWith('c-1');
      expect(loggerMock.error).toHaveBeenCalled();
    });

    it('should handle partial failures (some succeed, some fail)', async () => {
      const changes = [
        makePendingChange({ id: 'c-1', entityId: 'b-1', changeType: 'create' }),
        makePendingChange({ id: 'c-2', entityId: 'b-2', changeType: 'create' }),
        makePendingChange({ id: 'c-3', entityId: 'b-3', changeType: 'create' })
      ];
      pendingChangesMock.getChangesForEntity.and.returnValue(changes);
      pendingChangesMock.removeChange.and.returnValue(Promise.resolve());
      pendingChangesMock.markRetry.and.returnValue(Promise.resolve());

      let callCount = 0;
      firestoreServiceMock.saveBirthday.and.callFake(() => {
        callCount++;
        if (callCount === 2) {
          return throwError(() => new Error('Firestore error'));
        }
        return of(undefined);
      });

      await service.processPendingChanges();

      expect(pendingChangesMock.removeChange).toHaveBeenCalledTimes(2);
      expect(pendingChangesMock.markRetry).toHaveBeenCalledTimes(1);
      expect(pendingChangesMock.markRetry).toHaveBeenCalledWith('c-2');
    });
  });

  describe('processCategoryChange', () => {
    beforeEach(() => {
      Object.defineProperty(authServiceMock, 'currentUser', { get: () => mockUser });
      Object.defineProperty(networkServiceMock, 'isOnline', { get: () => true });
    });

    it('should process category create/update via saveCategory', async () => {
      const categoryData = { id: 'cat-1', name: 'Family', color: '#ff0000', icon: 'group' };
      const change = makePendingChange({
        id: 'c-cat-1', entityType: 'category', entityId: 'cat-1',
        changeType: 'create', data: categoryData
      });
      pendingChangesMock.getChangesForEntity.and.returnValue([change]);
      firestoreServiceMock.saveCategory.and.returnValue(of(undefined));
      pendingChangesMock.removeChange.and.returnValue(Promise.resolve());

      await service.processPendingChanges();

      expect(firestoreServiceMock.saveCategory).toHaveBeenCalledWith('user-123', categoryData);
    });

    it('should process category delete via deleteCategory', async () => {
      const change = makePendingChange({
        id: 'c-cat-2', entityType: 'category', entityId: 'cat-1',
        changeType: 'delete', data: null
      });
      pendingChangesMock.getChangesForEntity.and.returnValue([change]);
      firestoreServiceMock.deleteCategory.and.returnValue(of(undefined));
      pendingChangesMock.removeChange.and.returnValue(Promise.resolve());

      await service.processPendingChanges();

      expect(firestoreServiceMock.deleteCategory).toHaveBeenCalledWith('user-123', 'cat-1');
    });
  });

  describe('queueChange with immediate processing', () => {
    it('should process immediately when online and authenticated', async () => {
      Object.defineProperty(authServiceMock, 'currentUser', { get: () => mockUser });
      Object.defineProperty(authServiceMock, 'isAuthenticated', { get: () => true });
      Object.defineProperty(networkServiceMock, 'isOnline', { get: () => true });

      pendingChangesMock.addChange.and.returnValue(Promise.resolve());
      pendingChangesMock.getChangesForEntity.and.returnValue([]);

      await service.queueChange('birthday', 'b-1', 'create', makeBirthday());

      expect(pendingChangesMock.getChangesForEntity).toHaveBeenCalled();
    });

    it('should not process immediately when offline', async () => {
      Object.defineProperty(authServiceMock, 'isAuthenticated', { get: () => true });
      Object.defineProperty(networkServiceMock, 'isOnline', { get: () => false });

      pendingChangesMock.addChange.and.returnValue(Promise.resolve());

      await service.queueChange('birthday', 'b-1', 'create', makeBirthday());

      expect(pendingChangesMock.getChangesForEntity).not.toHaveBeenCalled();
    });

    it('should not process immediately when not authenticated', async () => {
      Object.defineProperty(authServiceMock, 'isAuthenticated', { get: () => false });
      Object.defineProperty(networkServiceMock, 'isOnline', { get: () => true });

      pendingChangesMock.addChange.and.returnValue(Promise.resolve());

      await service.queueChange('birthday', 'b-1', 'create', makeBirthday());

      expect(pendingChangesMock.getChangesForEntity).not.toHaveBeenCalled();
    });
  });

  describe('mergeCloudWithLocal', () => {
    beforeEach(() => {
      offlineStorageMock.saveBirthdays.and.returnValue(Promise.resolve());
      firestoreServiceMock.saveBirthdaysBatch.and.returnValue(of(undefined));
    });

    it('should call mergeService.merge with latest-wins strategy', async () => {
      const cloudBirthdays = [makeBirthday({ id: 'cloud-1', name: 'Cloud Only' })];
      const localBirthdays = [makeBirthday({ id: 'local-1', name: 'Local Only' })];
      offlineStorageMock.getBirthdays.and.returnValue(Promise.resolve(localBirthdays));
      mergeServiceMock.merge.and.returnValue({ merged: [...cloudBirthdays, ...localBirthdays], toUpload: [] });

      await service['mergeCloudWithLocal'](cloudBirthdays, 'user-123');

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

      await service['mergeCloudWithLocal']([], 'user-123');

      expect(offlineStorageMock.saveBirthdays).toHaveBeenCalledWith(mergedBirthdays);
    });

    it('should upload toUpload items to cloud when online', async () => {
      const toUploadItems = [makeBirthday({ id: 'local-1', name: 'Local Only' })];
      offlineStorageMock.getBirthdays.and.returnValue(Promise.resolve([]));
      mergeServiceMock.merge.and.returnValue({ merged: toUploadItems, toUpload: toUploadItems });
      Object.defineProperty(networkServiceMock, 'isOnline', { get: () => true });

      await service['mergeCloudWithLocal']([], 'user-123');

      expect(firestoreServiceMock.saveBirthdaysBatch).toHaveBeenCalledWith('user-123', toUploadItems);
    });

    it('should not upload when offline', async () => {
      const toUploadItems = [makeBirthday({ id: 'local-1' })];
      offlineStorageMock.getBirthdays.and.returnValue(Promise.resolve([]));
      mergeServiceMock.merge.and.returnValue({ merged: toUploadItems, toUpload: toUploadItems });
      Object.defineProperty(networkServiceMock, 'isOnline', { get: () => false });

      await service['mergeCloudWithLocal']([], 'user-123');

      expect(firestoreServiceMock.saveBirthdaysBatch).not.toHaveBeenCalled();
    });

    it('should not upload when toUpload is empty', async () => {
      offlineStorageMock.getBirthdays.and.returnValue(Promise.resolve([]));
      mergeServiceMock.merge.and.returnValue({ merged: [], toUpload: [] });
      Object.defineProperty(networkServiceMock, 'isOnline', { get: () => true });

      await service['mergeCloudWithLocal']([], 'user-123');

      expect(firestoreServiceMock.saveBirthdaysBatch).not.toHaveBeenCalled();
    });

    it('should dispatch syncSuccess after merge', async () => {
      offlineStorageMock.getBirthdays.and.returnValue(Promise.resolve([]));
      mergeServiceMock.merge.and.returnValue({ merged: [], toUpload: [] });
      spyOn(store, 'dispatch');

      await service['mergeCloudWithLocal']([], 'user-123');

      expect(store.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({ type: '[Sync] Success' })
      );
    });
  });

  describe('migrateLocalToCloud', () => {
    it('should add sync metadata to migrated birthdays', async () => {
      Object.defineProperty(authServiceMock, 'currentUser', { get: () => mockUser });
      const localBirthdays = [makeBirthday({ id: 'b-1' })];
      offlineStorageMock.getBirthdays.and.returnValue(Promise.resolve(localBirthdays));
      firestoreServiceMock.saveBirthdaysBatch.and.returnValue(of(undefined));
      offlineStorageMock.saveBirthdays.and.returnValue(Promise.resolve());

      await service.migrateLocalToCloud();

      const uploadedBirthdays = firestoreServiceMock.saveBirthdaysBatch.calls.mostRecent().args[1];
      expect(uploadedBirthdays[0].ownerId).toBe('user-123');
      expect(uploadedBirthdays[0].syncStatus).toBe('synced');
      expect(uploadedBirthdays[0].updatedAt).toBeDefined();
    });

    it('should update local storage with sync metadata', async () => {
      Object.defineProperty(authServiceMock, 'currentUser', { get: () => mockUser });
      const localBirthdays = [makeBirthday({ id: 'b-1' })];
      offlineStorageMock.getBirthdays.and.returnValue(Promise.resolve(localBirthdays));
      firestoreServiceMock.saveBirthdaysBatch.and.returnValue(of(undefined));
      offlineStorageMock.saveBirthdays.and.returnValue(Promise.resolve());

      await service.migrateLocalToCloud();

      const savedBirthdays = offlineStorageMock.saveBirthdays.calls.mostRecent().args[0];
      expect(savedBirthdays[0].syncStatus).toBe('synced');
    });

    it('should migrate multiple birthdays', async () => {
      Object.defineProperty(authServiceMock, 'currentUser', { get: () => mockUser });
      const localBirthdays = [
        makeBirthday({ id: 'b-1' }),
        makeBirthday({ id: 'b-2' }),
        makeBirthday({ id: 'b-3' })
      ];
      offlineStorageMock.getBirthdays.and.returnValue(Promise.resolve(localBirthdays));
      firestoreServiceMock.saveBirthdaysBatch.and.returnValue(of(undefined));
      offlineStorageMock.saveBirthdays.and.returnValue(Promise.resolve());

      const count = await service.migrateLocalToCloud();
      expect(count).toBe(3);
    });

    it('should preserve existing updatedAt during migration', async () => {
      Object.defineProperty(authServiceMock, 'currentUser', { get: () => mockUser });
      const existingTimestamp = 1700000000000;
      const localBirthdays = [makeBirthday({ id: 'b-1', updatedAt: existingTimestamp })];
      offlineStorageMock.getBirthdays.and.returnValue(Promise.resolve(localBirthdays));
      firestoreServiceMock.saveBirthdaysBatch.and.returnValue(of(undefined));
      offlineStorageMock.saveBirthdays.and.returnValue(Promise.resolve());

      await service.migrateLocalToCloud();

      const uploadedBirthdays = firestoreServiceMock.saveBirthdaysBatch.calls.mostRecent().args[1];
      expect(uploadedBirthdays[0].updatedAt).toBe(existingTimestamp);
    });
  });
});
