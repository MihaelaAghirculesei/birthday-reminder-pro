import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { SyncCoordinatorService } from './sync-coordinator.service';
import { FirebaseAuthService, AuthUser } from './firebase-auth.service';
import { FirestoreService } from './firestore.service';
import { IndexedDBStorageService } from './offline-storage.service';
import { PendingChangesService, PendingChange } from './pending-changes.service';
import { NetworkService } from './network.service';
import { LoggerService } from './logger.service';
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
      birthDate: new Date('1990-05-15'),
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
        { provide: LoggerService, useValue: loggerMock }
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
      { id: 'b-1', name: 'Test', birthDate: new Date() }
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

  // =====================================================
  // CONFLICT RESOLUTION TESTS
  // =====================================================
  describe('resolveConflict', () => {
    it('should prefer cloud when timestamps are equal (server authority)', () => {
      const local = makeBirthday({ id: 'b-1', name: 'Local Name', updatedAt: 1000 });
      const cloud = makeBirthday({ id: 'b-1', name: 'Cloud Name', updatedAt: 1000 });

      const result = service['resolveConflict'](local, cloud);
      expect(result.name).toBe('Cloud Name');
    });

    it('should prefer local when local timestamp is newer (>1s diff)', () => {
      const local = makeBirthday({ id: 'b-1', name: 'Local Name', updatedAt: 5000 });
      const cloud = makeBirthday({ id: 'b-1', name: 'Cloud Name', updatedAt: 2000 });

      const result = service['resolveConflict'](local, cloud);
      expect(result.name).toBe('Local Name');
    });

    it('should prefer cloud when cloud timestamp is newer (>1s diff)', () => {
      const local = makeBirthday({ id: 'b-1', name: 'Local Name', updatedAt: 2000 });
      const cloud = makeBirthday({ id: 'b-1', name: 'Cloud Name', updatedAt: 5000 });

      const result = service['resolveConflict'](local, cloud);
      expect(result.name).toBe('Cloud Name');
    });

    it('should merge fields for near-simultaneous edits (<1s diff)', () => {
      const local = makeBirthday({
        id: 'b-1', name: 'Local Name', notes: '', category: 'friends',
        updatedAt: 1000
      });
      const cloud = makeBirthday({
        id: 'b-1', name: 'Cloud Name', notes: 'Important note', category: '',
        updatedAt: 1500 // within 1 second
      });

      const result = service['resolveConflict'](local, cloud);
      // Winner is cloud (newer), but preserves notes from loser
      expect(result.name).toBe('Cloud Name');
      expect(result.notes).toBe('Important note');
      expect(result.category).toBe('friends');
      expect(result.updatedAt).toBe(1500);
      expect(result.syncStatus).toBe('synced');
    });

    it('should preserve notes from loser when winner has none', () => {
      const local = makeBirthday({
        id: 'b-1', notes: 'My note', updatedAt: 1200
      });
      const cloud = makeBirthday({
        id: 'b-1', notes: '', updatedAt: 1100
      });

      const result = service['resolveConflict'](local, cloud);
      expect(result.notes).toBe('My note');
    });

    it('should preserve category from loser when winner has none', () => {
      const local = makeBirthday({
        id: 'b-1', category: '', updatedAt: 1100
      });
      const cloud = makeBirthday({
        id: 'b-1', category: 'family', updatedAt: 1200
      });

      const result = service['resolveConflict'](local, cloud);
      expect(result.category).toBe('family');
    });

    it('should handle undefined updatedAt (treat as 0)', () => {
      const local = makeBirthday({ id: 'b-1', name: 'Local', updatedAt: undefined });
      const cloud = makeBirthday({ id: 'b-1', name: 'Cloud', updatedAt: undefined });

      const result = service['resolveConflict'](local, cloud);
      // Equal timestamps (both 0) → prefer cloud
      expect(result.name).toBe('Cloud');
    });

    it('should use max timestamp for near-simultaneous edits', () => {
      const local = makeBirthday({ id: 'b-1', updatedAt: 1300 });
      const cloud = makeBirthday({ id: 'b-1', updatedAt: 1800 });

      const result = service['resolveConflict'](local, cloud);
      expect(result.updatedAt).toBe(1800);
    });
  });

  // =====================================================
  // PROCESS PENDING CHANGES TESTS
  // =====================================================
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

      // First and third succeed, second fails
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

  // =====================================================
  // CATEGORY CHANGE PROCESSING TESTS
  // =====================================================
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

  // =====================================================
  // QUEUE CHANGE + IMMEDIATE PROCESSING TESTS
  // =====================================================
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

      // processPendingChanges is called but exits early because no currentUser
      expect(pendingChangesMock.getChangesForEntity).not.toHaveBeenCalled();
    });
  });

  // =====================================================
  // MERGE CLOUD WITH LOCAL TESTS
  // =====================================================
  describe('mergeCloudWithLocal', () => {
    beforeEach(() => {
      offlineStorageMock.saveBirthdays.and.returnValue(Promise.resolve());
      firestoreServiceMock.saveBirthdaysBatch.and.returnValue(of(undefined));
    });

    it('should keep cloud-only items', async () => {
      const cloudBirthdays = [makeBirthday({ id: 'cloud-1', name: 'Cloud Only' })];
      offlineStorageMock.getBirthdays.and.returnValue(Promise.resolve([]));

      await service['mergeCloudWithLocal'](cloudBirthdays, 'user-123');

      const savedBirthdays = offlineStorageMock.saveBirthdays.calls.mostRecent().args[0];
      expect(savedBirthdays.length).toBe(1);
      expect(savedBirthdays[0].name).toBe('Cloud Only');
    });

    it('should keep local-only items and queue for upload', async () => {
      const localBirthdays = [makeBirthday({ id: 'local-1', name: 'Local Only' })];
      offlineStorageMock.getBirthdays.and.returnValue(Promise.resolve(localBirthdays));

      await service['mergeCloudWithLocal']([], 'user-123');

      const savedBirthdays = offlineStorageMock.saveBirthdays.calls.mostRecent().args[0];
      expect(savedBirthdays.length).toBe(1);
      expect(savedBirthdays[0].name).toBe('Local Only');
    });

    it('should upload local-only items to cloud when online', async () => {
      const localBirthdays = [makeBirthday({ id: 'local-1', name: 'Local Only' })];
      offlineStorageMock.getBirthdays.and.returnValue(Promise.resolve(localBirthdays));
      Object.defineProperty(networkServiceMock, 'isOnline', { get: () => true });

      await service['mergeCloudWithLocal']([], 'user-123');

      expect(firestoreServiceMock.saveBirthdaysBatch).toHaveBeenCalledWith(
        'user-123', jasmine.arrayContaining([jasmine.objectContaining({ id: 'local-1' })])
      );
    });

    it('should not upload when offline', async () => {
      const localBirthdays = [makeBirthday({ id: 'local-1' })];
      offlineStorageMock.getBirthdays.and.returnValue(Promise.resolve(localBirthdays));
      Object.defineProperty(networkServiceMock, 'isOnline', { get: () => false });

      await service['mergeCloudWithLocal']([], 'user-123');

      expect(firestoreServiceMock.saveBirthdaysBatch).not.toHaveBeenCalled();
    });

    it('should resolve conflicts for items existing in both', async () => {
      const cloudBirthday = makeBirthday({ id: 'b-1', name: 'Cloud', updatedAt: 5000 });
      const localBirthday = makeBirthday({ id: 'b-1', name: 'Local', updatedAt: 2000 });

      offlineStorageMock.getBirthdays.and.returnValue(Promise.resolve([localBirthday]));

      await service['mergeCloudWithLocal']([cloudBirthday], 'user-123');

      const savedBirthdays = offlineStorageMock.saveBirthdays.calls.mostRecent().args[0];
      expect(savedBirthdays.length).toBe(1);
      expect(savedBirthdays[0].name).toBe('Cloud'); // Cloud wins (newer)
    });

    it('should upload local winner items to cloud', async () => {
      const cloudBirthday = makeBirthday({ id: 'b-1', name: 'Cloud', updatedAt: 2000 });
      const localBirthday = makeBirthday({ id: 'b-1', name: 'Local', updatedAt: 5000 });

      offlineStorageMock.getBirthdays.and.returnValue(Promise.resolve([localBirthday]));
      Object.defineProperty(networkServiceMock, 'isOnline', { get: () => true });

      await service['mergeCloudWithLocal']([cloudBirthday], 'user-123');

      const savedBirthdays = offlineStorageMock.saveBirthdays.calls.mostRecent().args[0];
      expect(savedBirthdays[0].name).toBe('Local'); // Local wins
      expect(firestoreServiceMock.saveBirthdaysBatch).toHaveBeenCalled();
    });

    it('should handle mixed scenario (cloud-only + local-only + conflicts)', async () => {
      const cloudBirthdays = [
        makeBirthday({ id: 'cloud-only', name: 'Cloud Only' }),
        makeBirthday({ id: 'shared-1', name: 'Cloud Version', updatedAt: 3000 })
      ];
      const localBirthdays = [
        makeBirthday({ id: 'local-only', name: 'Local Only' }),
        makeBirthday({ id: 'shared-1', name: 'Local Version', updatedAt: 5000 })
      ];
      offlineStorageMock.getBirthdays.and.returnValue(Promise.resolve(localBirthdays));
      Object.defineProperty(networkServiceMock, 'isOnline', { get: () => true });

      await service['mergeCloudWithLocal'](cloudBirthdays, 'user-123');

      const savedBirthdays = offlineStorageMock.saveBirthdays.calls.mostRecent().args[0];
      expect(savedBirthdays.length).toBe(3);

      const names = savedBirthdays.map((b: Birthday) => b.name);
      expect(names).toContain('Cloud Only');
      expect(names).toContain('Local Only');
      expect(names).toContain('Local Version'); // Local wins conflict
    });
  });

  // =====================================================
  // MIGRATION TESTS
  // =====================================================
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
