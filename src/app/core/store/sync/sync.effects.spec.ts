import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Observable, of } from 'rxjs';
import { Action } from '@ngrx/store';
import { SyncEffects } from './sync.effects';
import * as SyncActions from './sync.actions';
import * as AuthSelectors from '../auth/auth.selectors';
import { SyncCoordinatorService } from '../../services/sync-coordinator.service';
import { IndexedDBStorageService } from '../../services/offline-storage.service';
import { NotificationService } from '../../services/notification.service';
import { LoggerService } from '../../services/logger.service';

describe('SyncEffects', () => {
  let actions$: Observable<Action>;
  let effects: SyncEffects;
  let store: MockStore;
  let syncCoordinatorMock: jasmine.SpyObj<SyncCoordinatorService>;
  let offlineStorageMock: jasmine.SpyObj<IndexedDBStorageService>;
  let notificationServiceMock: jasmine.SpyObj<NotificationService>;
  let loggerMock: jasmine.SpyObj<LoggerService>;

  const initialState = {
    auth: { user: { uid: 'user-123' }, loading: false, error: null, initialized: true },
    sync: { state: 'idle', lastSyncAt: null, pendingChanges: 0, error: null, isOnline: true }
  };

  beforeEach(() => {
    syncCoordinatorMock = jasmine.createSpyObj('SyncCoordinatorService', [
      'migrateLocalToCloud',
      'processPendingChanges'
    ]);
    offlineStorageMock = jasmine.createSpyObj('IndexedDBStorageService', [
      'getBirthdays',
      'saveBirthdays'
    ]);
    notificationServiceMock = jasmine.createSpyObj('NotificationService', ['show']);
    loggerMock = jasmine.createSpyObj('LoggerService', ['log', 'info', 'warn', 'error']);

    TestBed.configureTestingModule({
      providers: [
        SyncEffects,
        provideMockActions(() => actions$),
        provideMockStore({ initialState }),
        { provide: SyncCoordinatorService, useValue: syncCoordinatorMock },
        { provide: IndexedDBStorageService, useValue: offlineStorageMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: LoggerService, useValue: loggerMock }
      ]
    });

    effects = TestBed.inject(SyncEffects);
    store = TestBed.inject(MockStore);
  });

  afterEach(() => {
    store.resetSelectors();
  });

  describe('migrateLocalToCloud$', () => {
    it('should dispatch migrationSuccess on successful migration', (done) => {
      syncCoordinatorMock.migrateLocalToCloud.and.returnValue(Promise.resolve(5));
      actions$ = of(SyncActions.migrateLocalToCloud());

      effects.migrateLocalToCloud$.subscribe((action) => {
        expect(action).toEqual(SyncActions.migrationSuccess({ migratedCount: 5 }));
        done();
      });
    });

    it('should dispatch migrationFailure on error', (done) => {
      syncCoordinatorMock.migrateLocalToCloud.and.returnValue(
        Promise.reject(new Error('Migration failed'))
      );
      actions$ = of(SyncActions.migrateLocalToCloud());

      effects.migrateLocalToCloud$.subscribe((action) => {
        expect(action).toEqual(SyncActions.migrationFailure({ error: 'Migration failed' }));
        done();
      });
    });
  });

  describe('migrationSuccess$', () => {
    it('should show notification when items migrated', (done) => {
      actions$ = of(SyncActions.migrationSuccess({ migratedCount: 5 }));

      effects.migrationSuccess$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith(
          '5 items synced to cloud',
          'success'
        );
        done();
      });
    });

    it('should not show notification when 0 items migrated', (done) => {
      actions$ = of(SyncActions.migrationSuccess({ migratedCount: 0 }));

      effects.migrationSuccess$.subscribe(() => {
        expect(notificationServiceMock.show).not.toHaveBeenCalled();
        done();
      });
    });
  });

  describe('migrationFailure$', () => {
    it('should show error notification', (done) => {
      actions$ = of(SyncActions.migrationFailure({ error: 'Network error' }));

      effects.migrationFailure$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith(
          'Sync failed: Network error',
          'error'
        );
        done();
      });
    });
  });

  describe('onlineStatusChanged$', () => {
    it('should dispatch pushPendingChanges when coming online and authenticated', (done) => {
      store.overrideSelector(AuthSelectors.selectIsAuthenticated, true);
      actions$ = of(SyncActions.setOnlineStatus({ isOnline: true }));

      effects.onlineStatusChanged$.subscribe((action) => {
        expect(action).toEqual(SyncActions.pushPendingChanges());
        done();
      });
    });
  });

  describe('pushPendingChanges$', () => {
    it('should call syncCoordinator.processPendingChanges', (done) => {
      actions$ = of(SyncActions.pushPendingChanges());

      effects.pushPendingChanges$.subscribe(() => {
        expect(syncCoordinatorMock.processPendingChanges).toHaveBeenCalled();
        done();
      });
    });
  });

  describe('syncFailure$', () => {
    it('should log sync failure error', (done) => {
      actions$ = of(SyncActions.syncFailure({ error: 'Sync error' }));

      effects.syncFailure$.subscribe(() => {
        expect(loggerMock.error).toHaveBeenCalled();
        done();
      });
    });

    it('should also handle pushChangesFailure', (done) => {
      actions$ = of(SyncActions.pushChangesFailure({ error: 'Push error' }));

      effects.syncFailure$.subscribe(() => {
        expect(loggerMock.error).toHaveBeenCalled();
        done();
      });
    });
  });
});
