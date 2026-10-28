import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { type Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { firstValueFrom,type Observable, of } from 'rxjs';
import type { MockedObject } from 'vitest';

import { type Birthday } from '../../../shared/models/birthday.model';
import { createMockBirthday } from '../../../testing/mock-data/birthday-mock.data';
import { provideTranslateTesting } from '../../../testing/translate-testing';
import { IdGeneratorService } from '../../services/id-generator.service';
import { LoggerService } from '../../services/logger.service';
import { IndexedDBStorageService } from '../../services/offline-storage.service';
import { PhotoStorageService } from '../../services/photo-storage.service';
import { PushNotificationService } from '../../services/push-notification.service';
import { SyncCoordinatorService } from '../../services/sync-coordinator.service';
import * as AuthSelectors from '../auth/auth.selectors';
import * as BirthdayActions from './birthday.actions';
import * as BirthdaySelectors from './birthday.selectors';
import { BirthdayCrudEffects } from './birthday-crud.effects';

describe('BirthdayCrudEffects', () => {
  let actions$: Observable<Action>;
  let effects: BirthdayCrudEffects;
  let store: MockStore;
  let offlineStorageMock: MockedObject<IndexedDBStorageService>;
  let pushNotificationMock: MockedObject<PushNotificationService>;
  let idGeneratorMock: MockedObject<IdGeneratorService>;
  let loggerMock: MockedObject<LoggerService>;
  let syncCoordinatorMock: MockedObject<SyncCoordinatorService>;
  let photoStorageMock: MockedObject<PhotoStorageService>;

  const mockBirthday = createMockBirthday({ id: '1', name: 'John Doe', category: 'Family' });

  const initialState = {
    birthdays: {
      ids: [],
      entities: {},
      filters: { searchTerm: '', selectedCategory: null },
      loading: false,
      error: null,
      optimisticBackup: []
    },
    auth: {
      user: null,
      loading: false,
      error: null,
      initialized: true
    },
    sync: {
      state: 'idle',
      lastSyncAt: null,
      pendingChanges: 0,
      error: null,
      isOnline: true
    }
  };

  beforeEach(() => {
    offlineStorageMock = {
      getBirthdays: vi.fn().mockName('IndexedDBStorageService.getBirthdays'),
      addBirthday: vi.fn().mockName('IndexedDBStorageService.addBirthday'),
      addBirthdays: vi.fn().mockName('IndexedDBStorageService.addBirthdays'),
      updateBirthday: vi.fn().mockName('IndexedDBStorageService.updateBirthday'),
      deleteBirthday: vi.fn().mockName('IndexedDBStorageService.deleteBirthday'),
      clear: vi.fn().mockName('IndexedDBStorageService.clear'),
      saveBirthdays: vi.fn().mockName('IndexedDBStorageService.saveBirthdays')
    } as unknown as MockedObject<IndexedDBStorageService>;
    pushNotificationMock = {
      cancelAllNotificationsForBirthday: vi.fn().mockName('PushNotificationService.cancelAllNotificationsForBirthday')
    } as unknown as MockedObject<PushNotificationService>;
    idGeneratorMock = {
      generateId: vi.fn().mockName('IdGeneratorService.generateId')
    } as unknown as MockedObject<IdGeneratorService>;
    loggerMock = {
      log: vi.fn().mockName('LoggerService.log'),
      info: vi.fn().mockName('LoggerService.info'),
      warn: vi.fn().mockName('LoggerService.warn'),
      error: vi.fn().mockName('LoggerService.error')
    } as unknown as MockedObject<LoggerService>;
    syncCoordinatorMock = {
      queueChange: vi.fn().mockName('SyncCoordinatorService.queueChange')
    } as unknown as MockedObject<SyncCoordinatorService>;
    photoStorageMock = {
      deletePhotoByUrl: vi.fn().mockName('PhotoStorageService.deletePhotoByUrl')
    } as unknown as MockedObject<PhotoStorageService>;
    photoStorageMock.deletePhotoByUrl.mockResolvedValue(undefined);

    offlineStorageMock.getBirthdays.mockReturnValue(Promise.resolve([]));
    offlineStorageMock.addBirthday.mockReturnValue(Promise.resolve());
    offlineStorageMock.addBirthdays.mockReturnValue(Promise.resolve());
    offlineStorageMock.updateBirthday.mockReturnValue(Promise.resolve());
    offlineStorageMock.deleteBirthday.mockReturnValue(Promise.resolve());
    offlineStorageMock.saveBirthdays.mockReturnValue(Promise.resolve());
    idGeneratorMock.generateId.mockReturnValue('new-id');
    syncCoordinatorMock.queueChange.mockReturnValue(Promise.resolve());

    TestBed.configureTestingModule({
      providers: [
        BirthdayCrudEffects,
        provideMockActions(() => actions$),
        provideMockStore({ initialState }),
        { provide: IndexedDBStorageService, useValue: offlineStorageMock },
        { provide: PushNotificationService, useValue: pushNotificationMock },
        { provide: IdGeneratorService, useValue: idGeneratorMock },
        { provide: LoggerService, useValue: loggerMock },
        { provide: SyncCoordinatorService, useValue: syncCoordinatorMock },
        { provide: PhotoStorageService, useValue: photoStorageMock },
        provideTranslateTesting()
      ]
    });

    effects = TestBed.inject(BirthdayCrudEffects);
    store = TestBed.inject(MockStore);
  });

  afterEach(() => {
    store.resetSelectors();
  });

  describe('loadBirthdays$', () => {
    it('should load birthdays successfully', async () => {
      const birthdays = [mockBirthday];
      offlineStorageMock.getBirthdays.mockReturnValue(Promise.resolve(birthdays));

      actions$ = of(BirthdayActions.loadBirthdays());

      const action = await firstValueFrom(effects.loadBirthdays$);
      const expectedBirthdays = [{ ...mockBirthday, category: 'family' }];
      expect(action).toEqual(BirthdayActions.loadBirthdaysSuccess({ birthdays: expectedBirthdays }));
      expect(offlineStorageMock.getBirthdays).toHaveBeenCalled();
    });

    it('should handle load birthdays failure', async () => {
      const error = new Error('Load failed');
      offlineStorageMock.getBirthdays.mockRejectedValue(error);

      actions$ = of(BirthdayActions.loadBirthdays());

      const action = await firstValueFrom(effects.loadBirthdays$);
      expect(action).toEqual(BirthdayActions.loadBirthdaysFailure({ error: 'Load failed' }));
    });

    it('should normalize category and add zodiac sign', async () => {
      const birthdayWithoutZodiac = { ...mockBirthday, zodiacSign: undefined };
      offlineStorageMock.getBirthdays.mockReturnValue(Promise.resolve([birthdayWithoutZodiac as Birthday]));

      actions$ = of(BirthdayActions.loadBirthdays());

      const action = await firstValueFrom(effects.loadBirthdays$);
      expect(action.type).toBe(BirthdayActions.loadBirthdaysSuccess.type);
      const successAction = action as ReturnType<typeof BirthdayActions.loadBirthdaysSuccess>;
      const loadedBirthday = successAction.birthdays[0];
      expect(loadedBirthday.zodiacSign).toBe('Capricorn');
    });
  });

  describe('addBirthday$', () => {
    it('should add birthday successfully without calendar sync', async () => {
      const newBirthday = { name: 'Jane Doe', birthDate: '1995-06-20', category: 'Friends' };

      actions$ = of(BirthdayActions.addBirthday({ birthday: newBirthday as Birthday }));

      const action = await firstValueFrom(effects.addBirthday$);
      expect(action.type).toBe(BirthdayActions.addBirthdaySuccess.type);
      const successAction = action as ReturnType<typeof BirthdayActions.addBirthdaySuccess>;
      expect(successAction.birthday.id).toBe('new-id');
      expect(successAction.birthday.name).toBe('Jane Doe');
      expect(offlineStorageMock.addBirthday).toHaveBeenCalled();
    });

    it('should handle add birthday failure', async () => {
      const newBirthday = { name: 'Jane Doe', birthDate: '1995-06-20', category: 'Friends' };
      const error = new Error('Add failed');
      offlineStorageMock.addBirthday.mockRejectedValue(error);

      actions$ = of(BirthdayActions.addBirthday({ birthday: newBirthday as Birthday }));

      const action = await firstValueFrom(effects.addBirthday$);
      expect(action).toEqual(BirthdayActions.addBirthdayFailure({ error: 'Add failed', birthday: newBirthday as Birthday }));
    });

    it('should queue sync change when user is authenticated', async () => {
      store.overrideSelector(AuthSelectors.selectUserId, 'user-123');
      store.refreshState();
      const newBirthday = { name: 'Jane Doe', birthDate: '1995-06-20', category: 'Friends' };

      actions$ = of(BirthdayActions.addBirthday({ birthday: newBirthday as Birthday }));

      const action = await firstValueFrom(effects.addBirthday$);
      expect(action.type).toBe(BirthdayActions.addBirthdaySuccess.type);
      expect(syncCoordinatorMock.queueChange).toHaveBeenCalledWith('birthday', expect.any(String), 'create', expect.any(Object));
    });
  });

  describe('updateBirthday$', () => {
    it('should update birthday successfully', async () => {
      actions$ = of(BirthdayActions.updateBirthday({ birthday: mockBirthday, operationId: 'op-1' }));

      const action = await firstValueFrom(effects.updateBirthday$);
      expect(action.type).toBe(BirthdayActions.updateBirthdaySuccess.type);
      const successAction = action as ReturnType<typeof BirthdayActions.updateBirthdaySuccess>;
      expect(successAction.birthday.category).toBe('family');
      expect(successAction.operationId).toBe('op-1');
      expect(offlineStorageMock.updateBirthday).toHaveBeenCalled();
    });

    it('should handle update birthday failure', async () => {
      const error = new Error('Update failed');
      offlineStorageMock.updateBirthday.mockRejectedValue(error);

      actions$ = of(BirthdayActions.updateBirthday({ birthday: mockBirthday, operationId: 'op-1' }));

      const action = await firstValueFrom(effects.updateBirthday$);
      expect(action).toEqual(BirthdayActions.updateBirthdayFailure({ error: 'Update failed', operationId: 'op-1', id: '1', birthday: mockBirthday }));
    });

    it('should queue sync change when user is authenticated', async () => {
      store.overrideSelector(AuthSelectors.selectUserId, 'user-123');
      store.refreshState();

      actions$ = of(BirthdayActions.updateBirthday({ birthday: mockBirthday, operationId: 'op-1' }));

      const action = await firstValueFrom(effects.updateBirthday$);
      expect(action.type).toBe(BirthdayActions.updateBirthdaySuccess.type);
      expect(syncCoordinatorMock.queueChange).toHaveBeenCalledWith('birthday', '1', 'update', expect.any(Object));
    });
  });

  describe('deleteBirthday$', () => {
    it('should delete birthday successfully and cancel notifications', async () => {
      store.overrideSelector(BirthdaySelectors.selectOptimisticBackup, [{ operationId: '1', entityId: '1', snapshot: mockBirthday }]);
      store.refreshState();
      actions$ = of(BirthdayActions.deleteBirthday({ id: '1' }));

      const action = await firstValueFrom(effects.deleteBirthday$);
      expect(action).toEqual(BirthdayActions.deleteBirthdaySuccess({ id: '1', birthday: mockBirthday }));
      expect(offlineStorageMock.deleteBirthday).toHaveBeenCalledWith('1');
      expect(pushNotificationMock.cancelAllNotificationsForBirthday).toHaveBeenCalledWith('1');
    });

    it('should dispatch deleteBirthdayFailure when birthday is not in optimistic backup', async () => {
      store.overrideSelector(BirthdaySelectors.selectOptimisticBackup, []);
      store.refreshState();
      actions$ = of(BirthdayActions.deleteBirthday({ id: 'missing-id' }));

      const action = await firstValueFrom(effects.deleteBirthday$);
      expect(action).toEqual(BirthdayActions.deleteBirthdayFailure({ error: 'Birthday not found', id: 'missing-id' }));
      expect(offlineStorageMock.deleteBirthday).not.toHaveBeenCalled();
    });

    it('should handle delete birthday failure', async () => {
      store.overrideSelector(BirthdaySelectors.selectOptimisticBackup, [{ operationId: '1', entityId: '1', snapshot: mockBirthday }]);
      store.refreshState();
      const error = new Error('Delete failed');
      offlineStorageMock.deleteBirthday.mockRejectedValue(error);

      actions$ = of(BirthdayActions.deleteBirthday({ id: '1' }));

      const action = await firstValueFrom(effects.deleteBirthday$);
      expect(action).toEqual(BirthdayActions.deleteBirthdayFailure({ error: 'Delete failed', id: '1' }));
    });

    it('should queue sync change when user is authenticated', async () => {
      store.overrideSelector(AuthSelectors.selectUserId, 'user-123');
      store.overrideSelector(BirthdaySelectors.selectOptimisticBackup, [{ operationId: '1', entityId: '1', snapshot: mockBirthday }]);
      store.refreshState();

      actions$ = of(BirthdayActions.deleteBirthday({ id: '1' }));

      const action = await firstValueFrom(effects.deleteBirthday$);
      expect(action).toEqual(BirthdayActions.deleteBirthdaySuccess({ id: '1', birthday: mockBirthday }));
      expect(syncCoordinatorMock.queueChange).toHaveBeenCalledWith('birthday', '1', 'delete');
    });

    it('should log a warning and still succeed when photo Storage cleanup rejects', async () => {
      const birthdayWithPhoto = createMockBirthday({
        id: '1',
        photo: 'https://firebasestorage.googleapis.com/v0/b/proj/o/photo.jpg?alt=media',
      });
      store.overrideSelector(BirthdaySelectors.selectOptimisticBackup, [{ operationId: '1', entityId: '1', snapshot: birthdayWithPhoto }]);
      store.refreshState();
      photoStorageMock.deletePhotoByUrl.mockRejectedValue(new Error('Storage error'));

      actions$ = of(BirthdayActions.deleteBirthday({ id: '1' }));

      const action = await firstValueFrom(effects.deleteBirthday$);
      expect(action).toEqual(BirthdayActions.deleteBirthdaySuccess({ id: '1', birthday: birthdayWithPhoto }));
      expect(loggerMock.warn).toHaveBeenCalledWith(expect.stringContaining('[BirthdayCrudEffects]'), '1', expect.any(String), expect.any(Error));
    });
  });

  describe('clearAllBirthdays$', () => {
    it('should clear all birthdays successfully', async () => {
      offlineStorageMock.clear.mockReturnValue(Promise.resolve());

      actions$ = of(BirthdayActions.clearAllBirthdays());

      const action = await firstValueFrom(effects.clearAllBirthdays$);
      expect(action).toEqual(BirthdayActions.clearAllBirthdaysSuccess());
      expect(offlineStorageMock.clear).toHaveBeenCalled();
    });

    it('should handle clear all birthdays failure', async () => {
      const error = new Error('Clear failed');
      offlineStorageMock.clear.mockRejectedValue(error);

      actions$ = of(BirthdayActions.clearAllBirthdays());

      const action = await firstValueFrom(effects.clearAllBirthdays$);
      expect(action).toEqual(BirthdayActions.clearAllBirthdaysFailure({ error: 'Clear failed' }));
    });
  });

  describe('importBirthdays$', () => {
    const birthdaysToImport = [
      { name: 'Alice', birthDate: '1990-03-01', category: 'Friends' } as Birthday,
      { name: 'Bob', birthDate: '1985-07-22', category: 'Work' } as Birthday,
    ];

    it('should import birthdays successfully without sync (anonymous user)', async () => {
      actions$ = of(BirthdayActions.importBirthdays({ birthdays: birthdaysToImport }));

      const action = await firstValueFrom(effects.importBirthdays$);
      expect(action.type).toBe(BirthdayActions.importBirthdaysSuccess.type);
      const successAction = action as ReturnType<typeof BirthdayActions.importBirthdaysSuccess>;
      expect(successAction.birthdays.length).toBe(2);
      expect(offlineStorageMock.addBirthdays).toHaveBeenCalled();
      expect(syncCoordinatorMock.queueChange).not.toHaveBeenCalled();
    });

    it('should queue a sync change per birthday when authenticated', async () => {
      store.overrideSelector(AuthSelectors.selectUserId, 'user-123');
      store.refreshState();

      actions$ = of(BirthdayActions.importBirthdays({ birthdays: birthdaysToImport }));

      const action = await firstValueFrom(effects.importBirthdays$);
      expect(action.type).toBe(BirthdayActions.importBirthdaysSuccess.type);
      expect(syncCoordinatorMock.queueChange).toHaveBeenCalledTimes(2);
      birthdaysToImport.forEach((_, i) => expect(vi.mocked(syncCoordinatorMock.queueChange).mock.calls[i][2]).toBe('create'));
    });

    it('should dispatch importBirthdaysFailure on storage error', async () => {
      const error = new Error('Import failed');
      offlineStorageMock.addBirthdays.mockRejectedValue(error);

      actions$ = of(BirthdayActions.importBirthdays({ birthdays: birthdaysToImport }));

      const action = await firstValueFrom(effects.importBirthdays$);
      expect(action).toEqual(BirthdayActions.importBirthdaysFailure({ error: 'Import failed' }));
    });
  });

  describe('loadTestData$', () => {
    it('should load test data successfully', async () => {
      actions$ = of(BirthdayActions.loadTestData());

      const action = await firstValueFrom(effects.loadTestData$);
      expect(action.type).toBe(BirthdayActions.loadTestDataSuccess.type);
      const successAction = action as ReturnType<typeof BirthdayActions.loadTestDataSuccess>;
      expect(successAction.birthdays.length).toBeGreaterThan(0);
    });

    it('should dispatch loadTestDataFailure on storage error', async () => {
      const error = new Error('Save failed');
      offlineStorageMock.saveBirthdays.mockRejectedValue(error);

      actions$ = of(BirthdayActions.loadTestData());

      const action = await firstValueFrom(effects.loadTestData$);
      expect(action).toEqual(BirthdayActions.loadTestDataFailure({ error: 'Save failed' }));
    });
  });
});
