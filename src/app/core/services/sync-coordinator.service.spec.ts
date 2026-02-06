import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { SyncCoordinatorService } from './sync-coordinator.service';
import { FirebaseAuthService, AuthUser } from './firebase-auth.service';
import { FirestoreService } from './firestore.service';
import { IndexedDBStorageService } from './offline-storage.service';
import { PendingChangesService } from './pending-changes.service';
import { NetworkService } from './network.service';
import { LoggerService } from './logger.service';
import { BehaviorSubject, of, Subject } from 'rxjs';
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
    service.ngOnDestroy();
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

  it('ngOnDestroy should clean up', () => {
    service.ngOnDestroy();
    expect(firestoreServiceMock.unsubscribeAll).toHaveBeenCalled();
  });
});
