import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { SyncQueueProcessorService } from './sync-queue-processor.service';
import { FirebaseAuthService, AuthUser } from './firebase-auth.service';
import { FirestoreService } from './firestore.service';
import { PendingChangesService, PendingChange } from './pending-changes.service';
import { NetworkService } from './network.service';
import { LoggerService } from './logger.service';
import { provideTranslateTesting } from '../../testing/translate-testing';
import * as SyncActions from '../store/sync/sync.actions';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { Birthday } from '../../shared/models/birthday.model';

describe('SyncQueueProcessorService', () => {
  let service: SyncQueueProcessorService;
  let store: MockStore;
  let authServiceMock: jasmine.SpyObj<FirebaseAuthService>;
  let firestoreServiceMock: jasmine.SpyObj<FirestoreService>;
  let pendingChangesMock: jasmine.SpyObj<PendingChangesService>;
  let networkServiceMock: Partial<NetworkService>;
  let loggerMock: jasmine.SpyObj<LoggerService>;

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

  let seqCounter = 0;

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
      sequenceNumber: seqCounter++,
      ...overrides
    };
  }

  beforeEach(() => {
    authServiceMock = jasmine.createSpyObj('FirebaseAuthService', [], {
      currentUser: null,
      isAuthenticated: false
    });
    firestoreServiceMock = jasmine.createSpyObj('FirestoreService', [
      'saveBirthday', 'deleteBirthday', 'saveCategory', 'deleteCategory'
    ]);
    pendingChangesMock = jasmine.createSpyObj('PendingChangesService', [
      'addChange', 'removeChange', 'markRetry', 'getChangesForEntity'
    ], {
      changes$: new BehaviorSubject<unknown[]>([]).asObservable(),
      pendingCount: 0
    });
    networkServiceMock = { isOnline: true } as Partial<NetworkService>;
    loggerMock = jasmine.createSpyObj('LoggerService', ['log', 'info', 'warn', 'error']);

    pendingChangesMock.addChange.and.returnValue(Promise.resolve());
    pendingChangesMock.removeChange.and.returnValue(Promise.resolve());
    pendingChangesMock.markRetry.and.returnValue(Promise.resolve());
    pendingChangesMock.getChangesForEntity.and.returnValue([]);

    TestBed.configureTestingModule({
      providers: [
        SyncQueueProcessorService,
        provideMockStore({ initialState }),
        { provide: FirebaseAuthService, useValue: authServiceMock },
        { provide: FirestoreService, useValue: firestoreServiceMock },
        { provide: PendingChangesService, useValue: pendingChangesMock },
        { provide: NetworkService, useValue: networkServiceMock },
        { provide: LoggerService, useValue: loggerMock },
        provideTranslateTesting()
      ]
    });

    service = TestBed.inject(SyncQueueProcessorService);
    store = TestBed.inject(MockStore);
  });

  afterEach(() => {
    store.resetSelectors();
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  describe('updatePendingCount', () => {
    it('should dispatch updatePendingCount action', () => {
      Object.defineProperty(pendingChangesMock, 'pendingCount', { get: () => 3 });
      const dispatchSpy = spyOn(store, 'dispatch');

      service.updatePendingCount();

      expect(dispatchSpy).toHaveBeenCalledWith(SyncActions.updatePendingCount({ count: 3 }));
    });
  });

  describe('queueChange', () => {
    it('should add change to pending changes', async () => {
      await service.queueChange('birthday', 'b-1', 'create', { name: 'Test' });
      expect(pendingChangesMock.addChange).toHaveBeenCalledWith(
        'birthday', 'b-1', 'create', { name: 'Test' }
      );
    });

    it('should dispatch pushPendingChanges when online and authenticated', async () => {
      Object.defineProperty(authServiceMock, 'isAuthenticated', { get: () => true });
      Object.defineProperty(networkServiceMock, 'isOnline', { get: () => true });
      const dispatchSpy = spyOn(store, 'dispatch');

      await service.queueChange('birthday', 'b-1', 'create', makeBirthday());

      expect(dispatchSpy).toHaveBeenCalledWith(SyncActions.pushPendingChanges());
    });

    it('should not dispatch when offline', async () => {
      Object.defineProperty(authServiceMock, 'isAuthenticated', { get: () => true });
      Object.defineProperty(networkServiceMock, 'isOnline', { get: () => false });
      const dispatchSpy = spyOn(store, 'dispatch');

      await service.queueChange('birthday', 'b-1', 'create', makeBirthday());

      expect(dispatchSpy).not.toHaveBeenCalledWith(SyncActions.pushPendingChanges());
    });

    it('should not dispatch when not authenticated', async () => {
      Object.defineProperty(authServiceMock, 'isAuthenticated', { get: () => false });
      Object.defineProperty(networkServiceMock, 'isOnline', { get: () => true });
      const dispatchSpy = spyOn(store, 'dispatch');

      await service.queueChange('birthday', 'b-1', 'create', makeBirthday());

      expect(dispatchSpy).not.toHaveBeenCalledWith(SyncActions.pushPendingChanges());
    });
  });

  describe('processPendingChanges', () => {
    beforeEach(() => {
      Object.defineProperty(authServiceMock, 'currentUser', { get: () => mockUser });
      Object.defineProperty(networkServiceMock, 'isOnline', { get: () => true });
    });

    it('should do nothing without user', async () => {
      Object.defineProperty(authServiceMock, 'currentUser', { get: () => null });
      await service.processPendingChanges();
      expect(pendingChangesMock.getChangesForEntity).not.toHaveBeenCalled();
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
      const change = makePendingChange({ id: 'c-1', entityId: 'b-new', changeType: 'create', data: birthday });
      pendingChangesMock.getChangesForEntity.and.returnValue([change]);
      firestoreServiceMock.saveBirthday.and.returnValue(of(undefined));

      await service.processPendingChanges();

      expect(firestoreServiceMock.saveBirthday).toHaveBeenCalledWith('user-123', birthday);
      expect(pendingChangesMock.removeChange).toHaveBeenCalledWith('c-1');
    });

    it('should process birthday update change', async () => {
      const birthday = makeBirthday({ id: 'b-1', name: 'Updated' });
      const change = makePendingChange({ id: 'c-2', entityId: 'b-1', changeType: 'update', data: birthday });
      pendingChangesMock.getChangesForEntity.and.returnValue([change]);
      firestoreServiceMock.saveBirthday.and.returnValue(of(undefined));

      await service.processPendingChanges();

      expect(firestoreServiceMock.saveBirthday).toHaveBeenCalledWith('user-123', birthday);
    });

    it('should process birthday delete change', async () => {
      const change = makePendingChange({ id: 'c-3', entityId: 'b-1', changeType: 'delete', data: null });
      pendingChangesMock.getChangesForEntity.and.returnValue([change]);
      firestoreServiceMock.deleteBirthday.and.returnValue(of(undefined));

      await service.processPendingChanges();

      expect(firestoreServiceMock.deleteBirthday).toHaveBeenCalledWith('user-123', 'b-1');
      expect(pendingChangesMock.removeChange).toHaveBeenCalledWith('c-3');
    });

    it('should process multiple changes in sequence', async () => {
      const changes = [
        makePendingChange({ id: 'c-1', entityId: 'b-1', changeType: 'create' }),
        makePendingChange({ id: 'c-2', entityId: 'b-2', changeType: 'create' }),
        makePendingChange({ id: 'c-3', entityId: 'b-3', changeType: 'delete' })
      ];
      pendingChangesMock.getChangesForEntity.and.returnValue(changes);
      firestoreServiceMock.saveBirthday.and.returnValue(of(undefined));
      firestoreServiceMock.deleteBirthday.and.returnValue(of(undefined));

      await service.processPendingChanges();

      expect(pendingChangesMock.removeChange).toHaveBeenCalledTimes(3);
    });

    it('should skip changes that exceeded MAX_RETRY_COUNT', async () => {
      const change = makePendingChange({ id: 'c-1', retryCount: 3 });
      pendingChangesMock.getChangesForEntity.and.returnValue([change]);

      await service.processPendingChanges();

      expect(firestoreServiceMock.saveBirthday).not.toHaveBeenCalled();
      expect(loggerMock.warn).toHaveBeenCalledWith(
        '[SyncQueueProcessor] Max retries reached for change:', 'c-1'
      );
    });

    it('should increment retry on failure', async () => {
      const change = makePendingChange({ id: 'c-1', retryCount: 1 });
      pendingChangesMock.getChangesForEntity.and.returnValue([change]);
      firestoreServiceMock.saveBirthday.and.returnValue(throwError(() => new Error('Network error')));

      await service.processPendingChanges();

      expect(pendingChangesMock.markRetry).toHaveBeenCalledWith('c-1');
      expect(loggerMock.error).toHaveBeenCalled();
    });

    it('should handle partial failures — some succeed, some fail', async () => {
      const changes = [
        makePendingChange({ id: 'c-1', entityId: 'b-1', changeType: 'create' }),
        makePendingChange({ id: 'c-2', entityId: 'b-2', changeType: 'create' }),
        makePendingChange({ id: 'c-3', entityId: 'b-3', changeType: 'create' })
      ];
      pendingChangesMock.getChangesForEntity.and.returnValue(changes);

      let callCount = 0;
      firestoreServiceMock.saveBirthday.and.callFake(() => {
        callCount++;
        if (callCount === 2) return throwError(() => new Error('Firestore error'));
        return of(undefined);
      });

      await service.processPendingChanges();

      expect(pendingChangesMock.removeChange).toHaveBeenCalledTimes(2);
      expect(pendingChangesMock.markRetry).toHaveBeenCalledTimes(1);
      expect(pendingChangesMock.markRetry).toHaveBeenCalledWith('c-2');
    });

    it('should block create when preceding delete for same entity fails (causal order)', async () => {
      const deleteChange = makePendingChange({
        id: 'del-1', entityId: 'b-x', changeType: 'delete', data: null, sequenceNumber: 0
      });
      const createChange = makePendingChange({
        id: 'cre-1', entityId: 'b-x', changeType: 'create',
        data: makeBirthday({ id: 'b-x' }), sequenceNumber: 1
      });

      pendingChangesMock.getChangesForEntity.and.returnValue([deleteChange, createChange]);
      firestoreServiceMock.deleteBirthday.and.returnValue(throwError(() => new Error('Network error')));

      await service.processPendingChanges();

      expect(firestoreServiceMock.deleteBirthday).toHaveBeenCalledWith('user-123', 'b-x');
      expect(pendingChangesMock.markRetry).toHaveBeenCalledWith('del-1');
      expect(firestoreServiceMock.saveBirthday).not.toHaveBeenCalled();
      expect(pendingChangesMock.removeChange).not.toHaveBeenCalledWith('cre-1');
    });

    it('should block create when preceding delete exhausted MAX_RETRY_COUNT', async () => {
      const exhaustedDelete = makePendingChange({
        id: 'del-x', entityId: 'b-y', changeType: 'delete', data: null,
        retryCount: 3, sequenceNumber: 0
      });
      const pendingCreate = makePendingChange({
        id: 'cre-x', entityId: 'b-y', changeType: 'create',
        data: makeBirthday({ id: 'b-y' }), sequenceNumber: 1
      });

      pendingChangesMock.getChangesForEntity.and.returnValue([exhaustedDelete, pendingCreate]);

      await service.processPendingChanges();

      expect(loggerMock.warn).toHaveBeenCalledWith(
        '[SyncQueueProcessor] Max retries reached for change:', 'del-x'
      );
      expect(firestoreServiceMock.saveBirthday).not.toHaveBeenCalled();
      expect(loggerMock.warn).toHaveBeenCalledWith(
        '[SyncQueueProcessor] Skipping change blocked by prior entity failure:', 'cre-x'
      );
    });
  });

  describe('processPendingChanges — invalid data', () => {
    beforeEach(() => {
      Object.defineProperty(authServiceMock, 'currentUser', { get: () => mockUser });
      Object.defineProperty(networkServiceMock, 'isOnline', { get: () => true });
    });

    it('should skip Firestore write and log when birthday data is invalid (safeParseBirthday fails)', async () => {
      const change = makePendingChange({
        id: 'c-invalid', entityId: 'b-bad', changeType: 'create', data: null
      });
      pendingChangesMock.getChangesForEntity.and.returnValue([change]);

      await service.processPendingChanges();

      expect(firestoreServiceMock.saveBirthday).not.toHaveBeenCalled();
      expect(loggerMock.error).toHaveBeenCalled();
    });

    it('should skip Firestore write and log when category data is invalid (safeParseCategory fails)', async () => {
      const change = makePendingChange({
        id: 'c-cat-bad', entityType: 'category', entityId: 'cat-bad',
        changeType: 'create', data: null
      });
      pendingChangesMock.getChangesForEntity.and.returnValue([change]);

      await service.processPendingChanges();

      expect(firestoreServiceMock.saveCategory).not.toHaveBeenCalled();
      expect(loggerMock.error).toHaveBeenCalled();
    });
  });

  describe('processPendingChanges — category changes', () => {
    beforeEach(() => {
      Object.defineProperty(authServiceMock, 'currentUser', { get: () => mockUser });
      Object.defineProperty(networkServiceMock, 'isOnline', { get: () => true });
    });

    it('should process category create via saveCategory', async () => {
      const categoryData = { id: 'cat-1', name: 'Family', color: '#ff0000', icon: 'group' };
      const change = makePendingChange({
        id: 'c-cat-1', entityType: 'category', entityId: 'cat-1',
        changeType: 'create', data: categoryData
      });
      pendingChangesMock.getChangesForEntity.and.returnValue([change]);
      firestoreServiceMock.saveCategory.and.returnValue(of(undefined));

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

      await service.processPendingChanges();

      expect(firestoreServiceMock.deleteCategory).toHaveBeenCalledWith('user-123', 'cat-1');
    });

  });

  describe('processPendingChanges — batching', () => {
    beforeEach(() => {
      Object.defineProperty(authServiceMock, 'currentUser', { get: () => mockUser });
      Object.defineProperty(networkServiceMock, 'isOnline', { get: () => true });
    });

    it('should split 150 changes into two batches and dispatch progress for each', async () => {
      const changes = Array.from({ length: 150 }, (_, i) => {
        const birthday = makeBirthday({ id: `b-${i}` });
        return makePendingChange({ id: `c-${i}`, entityId: `b-${i}`, changeType: 'create', data: birthday });
      });
      pendingChangesMock.getChangesForEntity.and.returnValue(changes);
      firestoreServiceMock.saveBirthday.and.returnValue(of(undefined));
      const dispatchSpy = spyOn(store, 'dispatch');

      const result = await service.processPendingChanges();

      expect(result).toBe(150);
      expect(firestoreServiceMock.saveBirthday).toHaveBeenCalledTimes(150);
      expect(dispatchSpy).toHaveBeenCalledWith(SyncActions.batchSyncProgress({ completed: 100, total: 150 }));
      expect(dispatchSpy).toHaveBeenCalledWith(SyncActions.batchSyncProgress({ completed: 150, total: 150 }));
    });

    it('should dispatch exactly one progress event for a queue under BATCH_SIZE', async () => {
      const change = makePendingChange({ id: 'c-1', entityId: 'b-1', changeType: 'create' });
      pendingChangesMock.getChangesForEntity.and.returnValue([change]);
      firestoreServiceMock.saveBirthday.and.returnValue(of(undefined));
      const dispatchSpy = spyOn(store, 'dispatch');

      await service.processPendingChanges();

      const progressCalls = dispatchSpy.calls.all()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter(call => (call.args[0] as unknown as any).type === '[Sync] Batch Sync Progress');
      expect(progressCalls.length).toBe(1);
      expect(dispatchSpy).toHaveBeenCalledWith(SyncActions.batchSyncProgress({ completed: 1, total: 1 }));
    });

    it('should call updatePendingCount once per batch', async () => {
      const changes = Array.from({ length: 220 }, (_, i) =>
        makePendingChange({ id: `c-${i}`, entityId: `b-${i}`, changeType: 'delete', data: null })
      );
      pendingChangesMock.getChangesForEntity.and.returnValue(changes);
      firestoreServiceMock.deleteBirthday.and.returnValue(of(undefined));
      const dispatchSpy = spyOn(store, 'dispatch');

      await service.processPendingChanges();

      // 220 changes → 3 batches (100+100+20), so 3 updatePendingCount dispatches
      const pendingCountCalls = dispatchSpy.calls.all()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter(call => (call.args[0] as unknown as any).type === '[Sync] Update Pending Count');
      expect(pendingCountCalls.length).toBe(3);
    });

    it('should respect causal order across batch boundaries', async () => {
      // delete at seq 0 (batch 1), create at seq 100 (batch 2) for same entity
      const deleteChange = makePendingChange({
        id: 'del-cross', entityId: 'b-cross', changeType: 'delete', data: null, sequenceNumber: 0
      });
      const createChange = makePendingChange({
        id: 'cre-cross', entityId: 'b-cross', changeType: 'create',
        data: makeBirthday({ id: 'b-cross' }), sequenceNumber: 100
      });
      // fill batch 1 with 99 unrelated changes so the create lands in batch 2
      const fillers = Array.from({ length: 99 }, (_, i) =>
        makePendingChange({ id: `filler-${i}`, entityId: `bf-${i}`, changeType: 'delete', data: null, sequenceNumber: i + 1 })
      );
      const allChanges = [deleteChange, ...fillers, createChange];
      pendingChangesMock.getChangesForEntity.and.returnValue(allChanges);
      firestoreServiceMock.deleteBirthday.and.callFake((uid: string, id: string) => {
        if (id === 'b-cross') return throwError(() => new Error('Network'));
        return of(undefined);
      });
      firestoreServiceMock.saveBirthday.and.returnValue(of(undefined));

      await service.processPendingChanges();

      expect(pendingChangesMock.markRetry).toHaveBeenCalledWith('del-cross');
      expect(firestoreServiceMock.saveBirthday).not.toHaveBeenCalled();
    });
  });

  describe('processPendingChanges — sort fallback to timestamp', () => {
    beforeEach(() => {
      Object.defineProperty(authServiceMock, 'currentUser', { get: () => mockUser });
      Object.defineProperty(networkServiceMock, 'isOnline', { get: () => true });
    });

    it('should fall back to timestamp when sequenceNumber is undefined (legacy record)', async () => {
      // Simulate two legacy IDB records that predate the sequenceNumber field.
      const older = {
        ...makePendingChange({ id: 'leg-1', entityId: 'b-leg-1', changeType: 'create' }),
        sequenceNumber: undefined as unknown as number,
        timestamp: 1000
      } as PendingChange;
      const newer = {
        ...makePendingChange({ id: 'leg-2', entityId: 'b-leg-2', changeType: 'create' }),
        sequenceNumber: undefined as unknown as number,
        timestamp: 2000
      } as PendingChange;

      pendingChangesMock.getChangesForEntity.and.returnValue([newer, older]);
      firestoreServiceMock.saveBirthday.and.returnValue(of(undefined));

      const result = await service.processPendingChanges();

      // Both changes must be processed regardless of input order.
      expect(result).toBe(2);
      expect(pendingChangesMock.removeChange).toHaveBeenCalledWith('leg-1');
      expect(pendingChangesMock.removeChange).toHaveBeenCalledWith('leg-2');
    });

    it('should process a mix of legacy (no sequenceNumber) and modern records correctly', async () => {
      const legacyChange = {
        ...makePendingChange({ id: 'leg-mix', entityId: 'b-mix-legacy', changeType: 'delete', data: null }),
        sequenceNumber: undefined as unknown as number,
        timestamp: 500
      } as PendingChange;
      const modernChange = makePendingChange({
        id: 'mod-mix', entityId: 'b-mix-modern', changeType: 'create',
        data: makeBirthday({ id: 'b-mix-modern' }), sequenceNumber: 1
      });

      pendingChangesMock.getChangesForEntity.and.returnValue([modernChange, legacyChange]);
      firestoreServiceMock.saveBirthday.and.returnValue(of(undefined));
      firestoreServiceMock.deleteBirthday.and.returnValue(of(undefined));

      const result = await service.processPendingChanges();

      expect(result).toBe(2);
    });
  });

  describe('processPendingChanges — concurrency guard', () => {
    beforeEach(() => {
      Object.defineProperty(authServiceMock, 'currentUser', { get: () => mockUser });
      Object.defineProperty(networkServiceMock, 'isOnline', { get: () => true });
    });

    it('should not run concurrently — second call defers until first completes', async () => {
      let resolveFirst!: () => void;
      const blockingPromise = new Promise<void>((resolve) => { resolveFirst = resolve; });

      const birthday = makeBirthday({ id: 'b-1' });
      const change = makePendingChange({ id: 'c-1', entityId: 'b-1', changeType: 'create', data: birthday });

      pendingChangesMock.getChangesForEntity.and.returnValue([change]);

      firestoreServiceMock.saveBirthday.and.callFake(() => {
        return new Observable((subscriber) => {
          blockingPromise.then(() => {
            subscriber.next(undefined);
            subscriber.complete();
          });
        });
      });

      const dispatchSpy = spyOn(store, 'dispatch');

      const firstRun = service.processPendingChanges();
      const secondRun = service.processPendingChanges();

      await secondRun;

      expect(firestoreServiceMock.saveBirthday).toHaveBeenCalledTimes(1);
      expect(pendingChangesMock.getChangesForEntity).toHaveBeenCalledTimes(1);

      resolveFirst();
      await firstRun;

      expect(dispatchSpy).toHaveBeenCalledWith(SyncActions.pushPendingChanges());
    });

    it('should not duplicate writes when called concurrently', async () => {
      const birthday = makeBirthday({ id: 'b-dup' });
      const change = makePendingChange({ id: 'c-dup', entityId: 'b-dup', changeType: 'create', data: birthday });

      let callCount = 0;
      pendingChangesMock.getChangesForEntity.and.callFake(() => {
        callCount++;
        if (callCount === 1) return [change];
        return [];
      });
      firestoreServiceMock.saveBirthday.and.returnValue(of(undefined));

      await Promise.all([
        service.processPendingChanges(),
        service.processPendingChanges(),
        service.processPendingChanges()
      ]);

      expect(firestoreServiceMock.saveBirthday).toHaveBeenCalledTimes(1);
    });

    it('should dispatch pushPendingChanges after first run if a call arrived during sync', async () => {
      const birthday1 = makeBirthday({ id: 'b-1' });
      const change1 = makePendingChange({ id: 'c-1', entityId: 'b-1', changeType: 'create', data: birthday1 });

      pendingChangesMock.getChangesForEntity.and.returnValue([change1]);
      firestoreServiceMock.saveBirthday.and.returnValue(of(undefined));
      const dispatchSpy = spyOn(store, 'dispatch');

      const firstRun = service.processPendingChanges();
      service.processPendingChanges(); // deferred via syncAgain

      await firstRun;

      expect(dispatchSpy).toHaveBeenCalledWith(SyncActions.pushPendingChanges());
    });
  });
});
