import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { type Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { type Observable, of } from 'rxjs';
import type { MockedObject } from 'vitest';

import { type Birthday } from '../../../shared/models/birthday.model';
import { provideTranslateTesting } from '../../../testing/translate-testing';
import { BirthdayMergeService, type MergeResult } from '../../services/birthday-merge.service';
import { LoggerService } from '../../services/logger.service';
import { NotificationService } from '../../services/notification.service';
import { IndexedDBStorageService } from '../../services/offline-storage.service';
import { SyncCoordinatorService } from '../../services/sync-coordinator.service';
import * as AuthSelectors from '../auth/auth.selectors';
import * as BirthdayActions from '../birthday/birthday.actions';
import * as SyncActions from './sync.actions';
import { SyncEffects } from './sync.effects';

describe('SyncEffects', () => {
  let actions$: Observable<Action>;
  let effects: SyncEffects;
  let store: MockStore;
  let syncCoordinatorMock: MockedObject<SyncCoordinatorService>;
  let offlineStorageMock: MockedObject<IndexedDBStorageService>;
  let notificationServiceMock: MockedObject<NotificationService>;
  let loggerMock: MockedObject<LoggerService>;
  let mergeServiceMock: MockedObject<BirthdayMergeService>;

  const initialState = {
    auth: { user: { uid: 'user-123' }, loading: false, error: null, initialized: true },
    sync: { state: 'idle', lastSyncAt: null, pendingChanges: 0, error: null, isOnline: true }
  };

  beforeEach(() => {
    syncCoordinatorMock = {
      migrateLocalToCloud: vi.fn().mockName('SyncCoordinatorService.migrateLocalToCloud'),
      processPendingChanges: vi.fn().mockName('SyncCoordinatorService.processPendingChanges')
    } as unknown as MockedObject<SyncCoordinatorService>;
    offlineStorageMock = {
      getBirthdays: vi.fn().mockName('IndexedDBStorageService.getBirthdays'),
      saveBirthdays: vi.fn().mockName('IndexedDBStorageService.saveBirthdays')
    } as unknown as MockedObject<IndexedDBStorageService>;
    notificationServiceMock = {
      show: vi.fn().mockName('NotificationService.show')
    } as unknown as MockedObject<NotificationService>;
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
    it('should dispatch migrationSuccess on successful migration', async () => {
      syncCoordinatorMock.migrateLocalToCloud.mockReturnValue(Promise.resolve(5));
      actions$ = of(SyncActions.migrateLocalToCloud());

      effects.migrateLocalToCloud$.subscribe((action) => {
        expect(action).toEqual(SyncActions.migrationSuccess({ migratedCount: 5 }));
      });
    });

    it('should dispatch migrationFailure on error', async () => {
      syncCoordinatorMock.migrateLocalToCloud.mockReturnValue(Promise.reject(new Error('Migration failed')));
      actions$ = of(SyncActions.migrateLocalToCloud());

      effects.migrateLocalToCloud$.subscribe((action) => {
        expect(action).toEqual(SyncActions.migrationFailure({ error: 'Migration failed' }));
      });
    });
  });

  describe('migrationSuccess$', () => {
    it('should show notification when items migrated', async () => {
      actions$ = of(SyncActions.migrationSuccess({ migratedCount: 5 }));

      effects.migrationSuccess$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith('5 items synced to cloud', 'success');
      });
    });

    it('should not show notification when 0 items migrated', async () => {
      actions$ = of(SyncActions.migrationSuccess({ migratedCount: 0 }));

      effects.migrationSuccess$.subscribe(() => {
        expect(notificationServiceMock.show).not.toHaveBeenCalled();
      });
    });
  });

  describe('migrationFailure$', () => {
    it('should show error notification with retry action', async () => {
      actions$ = of(SyncActions.migrationFailure({ error: 'Network error' }));

      effects.migrationFailure$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith('Cloud migration failed: Network error', 'error', undefined, expect.objectContaining({ label: 'Retry' }));
      });
    });
  });

  describe('cloudBirthdaysUpdated$', () => {
    it('should call mergeService.merge with cloud-wins strategy and dispatch syncSuccess', async () => {
      const cloudBirthdays: Birthday[] = [
        { id: 'b-1', name: 'Cloud', birthDate: '1990-01-01', zodiacSign: 'Capricorn' } as Birthday
      ];
      const localBirthdays: Birthday[] = [
        { id: 'b-2', name: 'Local', birthDate: '1991-02-02', zodiacSign: 'Aquarius' } as Birthday
      ];

      offlineStorageMock.getBirthdays.mockReturnValue(Promise.resolve(localBirthdays));
      offlineStorageMock.saveBirthdays.mockReturnValue(Promise.resolve());
      mergeServiceMock.merge.mockReturnValue({
        merged: [...cloudBirthdays, ...localBirthdays],
        toUpload: []
      });

      actions$ = of(SyncActions.cloudBirthdaysUpdated({ birthdays: cloudBirthdays }));

      effects.cloudBirthdaysUpdated$.subscribe((action) => {
        expect(mergeServiceMock.merge).toHaveBeenCalledWith(localBirthdays, cloudBirthdays, { strategy: 'cloud-wins' });
        expect(offlineStorageMock.saveBirthdays).toHaveBeenCalledWith([...cloudBirthdays, ...localBirthdays]);
        expect(action.type).toBe('[Sync] Success');
      });
    });

    it('should dispatch syncFailure on error', async () => {
      offlineStorageMock.getBirthdays.mockReturnValue(Promise.reject(new Error('DB error')));

      actions$ = of(SyncActions.cloudBirthdaysUpdated({ birthdays: [] }));

      effects.cloudBirthdaysUpdated$.subscribe((action) => {
        expect(action).toEqual(SyncActions.syncFailure({ error: 'DB error' }));
      });
    });

    it('should dispatch loadBirthdays after saving merged result', async () => {
      offlineStorageMock.getBirthdays.mockReturnValue(Promise.resolve([]));
      offlineStorageMock.saveBirthdays.mockReturnValue(Promise.resolve());
      mergeServiceMock.merge.mockReturnValue({ merged: [], toUpload: [] });
      const dispatchSpy = vi.spyOn(store, 'dispatch');

      actions$ = of(SyncActions.cloudBirthdaysUpdated({ birthdays: [] }));

      effects.cloudBirthdaysUpdated$.subscribe(() => {
        expect(dispatchSpy).toHaveBeenCalledWith(BirthdayActions.loadBirthdays());
      });
    });

    it('should preserve local pending item when cloud update arrives for the same birthday', async () => {
      // Device A is offline and edits b-1 (pending). Device B edits b-1 on Firestore.
      // When A comes online and the real-time listener fires, the pending local version
      // must NOT be overwritten — cloud-wins strategy preserves pending items.
      const pendingLocal: Birthday = {
        id: 'b-1', name: 'Local Edit', birthDate: '1990-01-01', zodiacSign: 'Capricorn',
        syncStatus: 'pending', updatedAt: 5000
      } as Birthday;
      const cloudUpdate: Birthday = {
        id: 'b-1', name: 'Cloud Edit', birthDate: '1990-01-01', zodiacSign: 'Capricorn',
        syncStatus: 'synced', updatedAt: 3000
      } as Birthday;

      offlineStorageMock.getBirthdays.mockReturnValue(Promise.resolve([pendingLocal]));
      offlineStorageMock.saveBirthdays.mockReturnValue(Promise.resolve());
      // Simulate what cloud-wins really returns for a pending local item
      mergeServiceMock.merge.mockReturnValue({ merged: [pendingLocal], toUpload: [] });

      actions$ = of(SyncActions.cloudBirthdaysUpdated({ birthdays: [cloudUpdate] }));

      effects.cloudBirthdaysUpdated$.subscribe(() => {
        const saved = vi.mocked(offlineStorageMock.saveBirthdays).mock.lastCall![0] as Birthday[];
        expect(saved[0].name).toBe('Local Edit');
        expect(saved[0].syncStatus).toBe('pending');
      });
    });

    it('should overwrite synced local with cloud version when cloud update arrives', async () => {
      // Device A has a synced birthday. Device B edits it on Firestore.
      // cloud-wins replaces the synced local version with whatever cloud sent —
      // note: timestamps are NOT compared in this path (asymmetry vs login path).
      const syncedLocal: Birthday = {
        id: 'b-1', name: 'Old Synced', birthDate: '1990-01-01', zodiacSign: 'Capricorn',
        syncStatus: 'synced', updatedAt: 9000
      } as Birthday;
      const cloudUpdate: Birthday = {
        id: 'b-1', name: 'Cloud New Version', birthDate: '1990-01-01', zodiacSign: 'Capricorn',
        syncStatus: 'synced', updatedAt: 1000
      } as Birthday;

      offlineStorageMock.getBirthdays.mockReturnValue(Promise.resolve([syncedLocal]));
      offlineStorageMock.saveBirthdays.mockReturnValue(Promise.resolve());
      // cloud-wins: synced local → cloud version wins regardless of timestamps
      mergeServiceMock.merge.mockReturnValue({
        merged: [{ ...cloudUpdate, syncStatus: 'synced' as const }],
        toUpload: []
      });

      actions$ = of(SyncActions.cloudBirthdaysUpdated({ birthdays: [cloudUpdate] }));

      effects.cloudBirthdaysUpdated$.subscribe(() => {
        const saved = vi.mocked(offlineStorageMock.saveBirthdays).mock.lastCall![0] as Birthday[];
        expect(saved[0].name).toBe('Cloud New Version');
        // Timestamps are NOT the tiebreaker here — syncStatus is (by design).
        // The local version had updatedAt=9000 but cloud (updatedAt=1000) still wins.
        expect(saved[0].updatedAt).toBe(1000);
      });
    });
  });

  describe('onlineStatusChanged$', () => {
    it('should dispatch pushPendingChanges when coming online and authenticated', async () => {
      store.overrideSelector(AuthSelectors.selectIsAuthenticated, true);
      actions$ = of(SyncActions.setOnlineStatus({ isOnline: true }));

      effects.onlineStatusChanged$.subscribe((action) => {
        expect(action).toEqual(SyncActions.pushPendingChanges());
      });
    });
  });

  describe('pushPendingChanges$', () => {
    it('should dispatch pushChangesSuccess on success', async () => {
      syncCoordinatorMock.processPendingChanges.mockReturnValue(Promise.resolve(3));
      actions$ = of(SyncActions.pushPendingChanges());

      effects.pushPendingChanges$.subscribe((action) => {
        expect(syncCoordinatorMock.processPendingChanges).toHaveBeenCalled();
        expect(action).toEqual(SyncActions.pushChangesSuccess({ syncedCount: 3 }));
      });
    });

    it('should dispatch pushChangesFailure on error', async () => {
      syncCoordinatorMock.processPendingChanges.mockReturnValue(Promise.reject(new Error('network error')));
      actions$ = of(SyncActions.pushPendingChanges());

      effects.pushPendingChanges$.subscribe((action) => {
        expect(action).toEqual(SyncActions.pushChangesFailure({ error: 'network error' }));
      });
    });
  });

  describe('syncFailure$', () => {
    it('should log sync failure error', async () => {
      actions$ = of(SyncActions.syncFailure({ error: 'Sync error' }));

      effects.syncFailure$.subscribe(() => {
        expect(loggerMock.error).toHaveBeenCalled();
      });
    });

    it('should also handle pushChangesFailure', async () => {
      actions$ = of(SyncActions.pushChangesFailure({ error: 'Push error' }));

      effects.syncFailure$.subscribe(() => {
        expect(loggerMock.error).toHaveBeenCalled();
      });
    });
  });
});
