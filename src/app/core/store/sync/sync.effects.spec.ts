import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Observable, of } from 'rxjs';
import { Action } from '@ngrx/store';
import { SyncEffects } from './sync.effects';
import * as SyncActions from './sync.actions';
import { provideTranslateTesting } from '../../../testing/translate-testing';
import * as AuthSelectors from '../auth/auth.selectors';
import { SyncCoordinatorService } from '../../services/sync-coordinator.service';
import { IndexedDBStorageService } from '../../services/offline-storage.service';
import { NotificationService } from '../../services/notification.service';
import { LoggerService } from '../../services/logger.service';
import { BirthdayMergeService, MergeResult } from '../../services/birthday-merge.service';
import { Birthday } from '../../../shared/models/birthday.model';

describe('SyncEffects', () => {
  let actions$: Observable<Action>;
  let effects: SyncEffects;
  let store: MockStore;
  let syncCoordinatorMock: jasmine.SpyObj<SyncCoordinatorService>;
  let offlineStorageMock: jasmine.SpyObj<IndexedDBStorageService>;
  let notificationServiceMock: jasmine.SpyObj<NotificationService>;
  let loggerMock: jasmine.SpyObj<LoggerService>;
  let mergeServiceMock: jasmine.SpyObj<BirthdayMergeService>;

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
    mergeServiceMock = jasmine.createSpyObj('BirthdayMergeService', ['merge']);
    mergeServiceMock.merge.and.returnValue({ merged: [], toUpload: [] } as MergeResult);

    TestBed.configureTestingModule({
      providers: [
        SyncEffects,
        provideMockActions(() => actions$),
        provideMockStore({ initialState }),
        { provide: SyncCoordinatorService, useValue: syncCoordinatorMock },
        { provide: IndexedDBStorageService, useValue: offlineStorageMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: LoggerService, useValue: loggerMock },
        { provide: BirthdayMergeService, useValue: mergeServiceMock },
        provideTranslateTesting()
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

  describe('cloudBirthdaysUpdated$', () => {
    it('should call mergeService.merge with cloud-wins strategy and dispatch syncSuccess', (done) => {
      const cloudBirthdays: Birthday[] = [
        { id: 'b-1', name: 'Cloud', birthDate: '1990-01-01', zodiacSign: 'Capricorn' } as Birthday
      ];
      const localBirthdays: Birthday[] = [
        { id: 'b-2', name: 'Local', birthDate: '1991-02-02', zodiacSign: 'Aquarius' } as Birthday
      ];

      offlineStorageMock.getBirthdays.and.returnValue(Promise.resolve(localBirthdays));
      offlineStorageMock.saveBirthdays.and.returnValue(Promise.resolve());
      mergeServiceMock.merge.and.returnValue({
        merged: [...cloudBirthdays, ...localBirthdays],
        toUpload: []
      });

      actions$ = of(SyncActions.cloudBirthdaysUpdated({ birthdays: cloudBirthdays }));

      effects.cloudBirthdaysUpdated$.subscribe((action) => {
        expect(mergeServiceMock.merge).toHaveBeenCalledWith(
          localBirthdays,
          cloudBirthdays,
          { strategy: 'cloud-wins' }
        );
        expect(offlineStorageMock.saveBirthdays).toHaveBeenCalledWith(
          [...cloudBirthdays, ...localBirthdays]
        );
        expect(action.type).toBe('[Sync] Success');
        done();
      });
    });

    it('should dispatch syncFailure on error', (done) => {
      offlineStorageMock.getBirthdays.and.returnValue(Promise.reject(new Error('DB error')));

      actions$ = of(SyncActions.cloudBirthdaysUpdated({ birthdays: [] }));

      effects.cloudBirthdaysUpdated$.subscribe((action) => {
        expect(action).toEqual(SyncActions.syncFailure({ error: 'DB error' }));
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
    it('should dispatch pushChangesSuccess on success', (done) => {
      syncCoordinatorMock.processPendingChanges.and.returnValue(Promise.resolve(3));
      actions$ = of(SyncActions.pushPendingChanges());

      effects.pushPendingChanges$.subscribe((action) => {
        expect(syncCoordinatorMock.processPendingChanges).toHaveBeenCalled();
        expect(action).toEqual(SyncActions.pushChangesSuccess({ syncedCount: 3 }));
        done();
      });
    });

    it('should dispatch pushChangesFailure on error', (done) => {
      syncCoordinatorMock.processPendingChanges.and.returnValue(Promise.reject(new Error('network error')));
      actions$ = of(SyncActions.pushPendingChanges());

      effects.pushPendingChanges$.subscribe((action) => {
        expect(action).toEqual(SyncActions.pushChangesFailure({ error: 'network error' }));
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
