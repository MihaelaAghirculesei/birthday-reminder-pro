import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { SyncCoordinatorService } from './sync-coordinator.service';
import { CloudSyncService } from './cloud-sync.service';
import { SyncQueueProcessorService } from './sync-queue-processor.service';
import { PendingChangesService } from './pending-changes.service';
import { NetworkService } from './network.service';
import { LoggerService } from './logger.service';
import { provideTranslateTesting } from '../../testing/translate-testing';
import * as SyncActions from '../store/sync/sync.actions';
import { AuthUser } from './firebase-auth.service';
import { BehaviorSubject } from 'rxjs';
import { Birthday } from '../../shared/models/birthday.model';

describe('SyncCoordinatorService', () => {
  let service: SyncCoordinatorService;
  let store: MockStore;
  let cloudSyncMock: jasmine.SpyObj<CloudSyncService>;
  let queueProcessorMock: jasmine.SpyObj<SyncQueueProcessorService>;
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

    cloudSyncMock = jasmine.createSpyObj('CloudSyncService', [
      'setupListeners', 'teardownListeners', 'checkForMigration', 'migrateLocalToCloud'
    ]);
    cloudSyncMock.migrateLocalToCloud.and.returnValue(Promise.resolve(0));
    cloudSyncMock.checkForMigration.and.returnValue(Promise.resolve());

    queueProcessorMock = jasmine.createSpyObj('SyncQueueProcessorService', [
      'updatePendingCount', 'queueChange', 'processPendingChanges'
    ]);
    queueProcessorMock.queueChange.and.returnValue(Promise.resolve());
    queueProcessorMock.processPendingChanges.and.returnValue(Promise.resolve(0));

    pendingChangesMock = jasmine.createSpyObj('PendingChangesService', ['initialize'], {
      changes$: new BehaviorSubject<unknown[]>([]).asObservable(),
      pendingCount: 0
    });
    pendingChangesMock.initialize.and.returnValue(Promise.resolve());

    networkServiceMock = {
      online$: networkOnline$.asObservable(),
      isOnline: true
    } as Partial<NetworkService>;

    loggerMock = jasmine.createSpyObj('LoggerService', ['log', 'info', 'warn', 'error']);

    TestBed.configureTestingModule({
      providers: [
        SyncCoordinatorService,
        provideMockStore({ initialState }),
        { provide: CloudSyncService, useValue: cloudSyncMock },
        { provide: SyncQueueProcessorService, useValue: queueProcessorMock },
        { provide: PendingChangesService, useValue: pendingChangesMock },
        { provide: NetworkService, useValue: networkServiceMock },
        { provide: LoggerService, useValue: loggerMock },
        provideTranslateTesting()
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

  describe('initialize', () => {
    it('should initialize pending changes and update count', async () => {
      await service.initialize();
      expect(pendingChangesMock.initialize).toHaveBeenCalled();
      expect(queueProcessorMock.updatePendingCount).toHaveBeenCalled();
    });

    it('should log initialized message', async () => {
      await service.initialize();
      expect(loggerMock.info).toHaveBeenCalledWith('[SyncCoordinator] Initialized');
    });

    it('should not run twice', async () => {
      await service.initialize();
      await service.initialize();
      expect(pendingChangesMock.initialize).toHaveBeenCalledTimes(1);
    });

    it('should dispatch setOnlineStatus when network changes', async () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      await service.initialize();

      networkOnline$.next(false);

      expect(dispatchSpy).toHaveBeenCalledWith(SyncActions.setOnlineStatus({ isOnline: false }));
    });

    it('should call cloudSync.setupListeners and checkForMigration when user signs in', async () => {
      await service.initialize();

      store.setState({
        ...initialState,
        auth: { user: mockUser, loading: false, error: null, initialized: true }
      });

      expect(cloudSyncMock.setupListeners).toHaveBeenCalledWith('user-123');
      expect(cloudSyncMock.checkForMigration).toHaveBeenCalledWith('user-123');
    });

    it('should call cloudSync.teardownListeners when user signs out', async () => {
      await service.initialize();

      store.setState({
        ...initialState,
        auth: { user: mockUser, loading: false, error: null, initialized: true }
      });
      store.setState({
        ...initialState,
        auth: { user: null, loading: false, error: null, initialized: true }
      });

      expect(cloudSyncMock.teardownListeners).toHaveBeenCalled();
    });

    it('should update pending count when changes$ emits', async () => {
      const changesSubject = new BehaviorSubject<unknown[]>([]);
      Object.defineProperty(pendingChangesMock, 'changes$', { get: () => changesSubject.asObservable() });

      await service.initialize();
      queueProcessorMock.updatePendingCount.calls.reset();

      changesSubject.next([{ id: 'c-1' }]);

      expect(queueProcessorMock.updatePendingCount).toHaveBeenCalled();
    });
  });

  describe('delegation', () => {
    it('migrateLocalToCloud delegates to cloudSync', async () => {
      cloudSyncMock.migrateLocalToCloud.and.returnValue(Promise.resolve(5));
      const result = await service.migrateLocalToCloud();
      expect(cloudSyncMock.migrateLocalToCloud).toHaveBeenCalled();
      expect(result).toBe(5);
    });

    it('queueChange delegates to queueProcessor', async () => {
      const birthday = { id: 'b-1' } as Birthday;
      await service.queueChange('birthday', 'b-1', 'create', birthday);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((queueProcessorMock.queueChange as any)).toHaveBeenCalledWith('birthday', 'b-1', 'create', birthday);
    });

    it('processPendingChanges delegates to queueProcessor', async () => {
      queueProcessorMock.processPendingChanges.and.returnValue(Promise.resolve(3));
      const result = await service.processPendingChanges();
      expect(queueProcessorMock.processPendingChanges).toHaveBeenCalled();
      expect(result).toBe(3);
    });
  });
});
