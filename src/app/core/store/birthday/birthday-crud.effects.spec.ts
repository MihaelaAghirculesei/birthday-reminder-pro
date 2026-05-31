import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { type Action } from '@ngrx/store';
import { MockStore,provideMockStore } from '@ngrx/store/testing';
import { type Observable, of } from 'rxjs';

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
  let offlineStorageMock: jasmine.SpyObj<IndexedDBStorageService>;
  let pushNotificationMock: jasmine.SpyObj<PushNotificationService>;
  let idGeneratorMock: jasmine.SpyObj<IdGeneratorService>;
  let loggerMock: jasmine.SpyObj<LoggerService>;
  let syncCoordinatorMock: jasmine.SpyObj<SyncCoordinatorService>;
  let photoStorageMock: jasmine.SpyObj<PhotoStorageService>;

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
    offlineStorageMock = jasmine.createSpyObj('IndexedDBStorageService', [
      'getBirthdays',
      'addBirthday',
      'addBirthdays',
      'updateBirthday',
      'deleteBirthday',
      'clear',
      'saveBirthdays'
    ]);
    pushNotificationMock = jasmine.createSpyObj('PushNotificationService', [
      'cancelAllNotificationsForBirthday'
    ]);
    idGeneratorMock = jasmine.createSpyObj('IdGeneratorService', ['generateId']);
    loggerMock = jasmine.createSpyObj('LoggerService', ['log', 'info', 'warn', 'error']);
    syncCoordinatorMock = jasmine.createSpyObj('SyncCoordinatorService', ['queueChange']);
    photoStorageMock = jasmine.createSpyObj('PhotoStorageService', ['deletePhotoByUrl']);
    photoStorageMock.deletePhotoByUrl.and.resolveTo();

    offlineStorageMock.getBirthdays.and.returnValue(Promise.resolve([]));
    offlineStorageMock.addBirthday.and.returnValue(Promise.resolve());
    offlineStorageMock.addBirthdays.and.returnValue(Promise.resolve());
    offlineStorageMock.updateBirthday.and.returnValue(Promise.resolve());
    offlineStorageMock.deleteBirthday.and.returnValue(Promise.resolve());
    offlineStorageMock.saveBirthdays.and.returnValue(Promise.resolve());
    idGeneratorMock.generateId.and.returnValue('new-id');
    syncCoordinatorMock.queueChange.and.returnValue(Promise.resolve());

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
    it('should load birthdays successfully', (done) => {
      const birthdays = [mockBirthday];
      offlineStorageMock.getBirthdays.and.returnValue(Promise.resolve(birthdays));

      actions$ = of(BirthdayActions.loadBirthdays());

      effects.loadBirthdays$.subscribe(action => {
        const expectedBirthdays = [{ ...mockBirthday, category: 'family' }];
        expect(action).toEqual(BirthdayActions.loadBirthdaysSuccess({ birthdays: expectedBirthdays }));
        expect(offlineStorageMock.getBirthdays).toHaveBeenCalled();
        done();
      });
    });

    it('should handle load birthdays failure', (done) => {
      const error = new Error('Load failed');
      offlineStorageMock.getBirthdays.and.returnValue(Promise.reject(error));

      actions$ = of(BirthdayActions.loadBirthdays());

      effects.loadBirthdays$.subscribe(action => {
        expect(action).toEqual(BirthdayActions.loadBirthdaysFailure({ error: 'Load failed' }));
        done();
      });
    });

    it('should normalize category and add zodiac sign', (done) => {
      const birthdayWithoutZodiac = { ...mockBirthday, zodiacSign: undefined };
      offlineStorageMock.getBirthdays.and.returnValue(Promise.resolve([birthdayWithoutZodiac as Birthday]));

      actions$ = of(BirthdayActions.loadBirthdays());

      effects.loadBirthdays$.subscribe(action => {
        expect(action.type).toBe(BirthdayActions.loadBirthdaysSuccess.type);
        const successAction = action as ReturnType<typeof BirthdayActions.loadBirthdaysSuccess>;
        const loadedBirthday = successAction.birthdays[0];
        expect(loadedBirthday.zodiacSign).toBe('Capricorn');
        done();
      });
    });
  });

  describe('addBirthday$', () => {
    it('should add birthday successfully without calendar sync', (done) => {
      const newBirthday = { name: 'Jane Doe', birthDate: '1995-06-20', category: 'Friends' };

      actions$ = of(BirthdayActions.addBirthday({ birthday: newBirthday as Birthday }));

      effects.addBirthday$.subscribe(action => {
        expect(action.type).toBe(BirthdayActions.addBirthdaySuccess.type);
        const successAction = action as ReturnType<typeof BirthdayActions.addBirthdaySuccess>;
        expect(successAction.birthday.id).toBe('new-id');
        expect(successAction.birthday.name).toBe('Jane Doe');
        expect(offlineStorageMock.addBirthday).toHaveBeenCalled();
        done();
      });
    });

    it('should handle add birthday failure', (done) => {
      const newBirthday = { name: 'Jane Doe', birthDate: '1995-06-20', category: 'Friends' };
      const error = new Error('Add failed');
      offlineStorageMock.addBirthday.and.returnValue(Promise.reject(error));

      actions$ = of(BirthdayActions.addBirthday({ birthday: newBirthday as Birthday }));

      effects.addBirthday$.subscribe(action => {
        expect(action).toEqual(BirthdayActions.addBirthdayFailure({ error: 'Add failed', birthday: newBirthday as Birthday }));
        done();
      });
    });

    it('should queue sync change when user is authenticated', (done) => {
      store.overrideSelector(AuthSelectors.selectUserId, 'user-123');
      store.refreshState();
      const newBirthday = { name: 'Jane Doe', birthDate: '1995-06-20', category: 'Friends' };

      actions$ = of(BirthdayActions.addBirthday({ birthday: newBirthday as Birthday }));

      effects.addBirthday$.subscribe(action => {
        expect(action.type).toBe(BirthdayActions.addBirthdaySuccess.type);
        expect(syncCoordinatorMock.queueChange).toHaveBeenCalledWith('birthday', jasmine.any(String), 'create', jasmine.any(Object));
        done();
      });
    });
  });

  describe('updateBirthday$', () => {
    it('should update birthday successfully', (done) => {
      actions$ = of(BirthdayActions.updateBirthday({ birthday: mockBirthday, operationId: 'op-1' }));

      effects.updateBirthday$.subscribe(action => {
        expect(action.type).toBe(BirthdayActions.updateBirthdaySuccess.type);
        const successAction = action as ReturnType<typeof BirthdayActions.updateBirthdaySuccess>;
        expect(successAction.birthday.category).toBe('family');
        expect(successAction.operationId).toBe('op-1');
        expect(offlineStorageMock.updateBirthday).toHaveBeenCalled();
        done();
      });
    });

    it('should handle update birthday failure', (done) => {
      const error = new Error('Update failed');
      offlineStorageMock.updateBirthday.and.returnValue(Promise.reject(error));

      actions$ = of(BirthdayActions.updateBirthday({ birthday: mockBirthday, operationId: 'op-1' }));

      effects.updateBirthday$.subscribe(action => {
        expect(action).toEqual(BirthdayActions.updateBirthdayFailure({ error: 'Update failed', operationId: 'op-1', id: '1', birthday: mockBirthday }));
        done();
      });
    });

    it('should queue sync change when user is authenticated', (done) => {
      store.overrideSelector(AuthSelectors.selectUserId, 'user-123');
      store.refreshState();

      actions$ = of(BirthdayActions.updateBirthday({ birthday: mockBirthday, operationId: 'op-1' }));

      effects.updateBirthday$.subscribe(action => {
        expect(action.type).toBe(BirthdayActions.updateBirthdaySuccess.type);
        expect(syncCoordinatorMock.queueChange).toHaveBeenCalledWith('birthday', '1', 'update', jasmine.any(Object));
        done();
      });
    });
  });

  describe('deleteBirthday$', () => {
    it('should delete birthday successfully and cancel notifications', (done) => {
      store.overrideSelector(BirthdaySelectors.selectOptimisticBackup, [{ operationId: '1', entityId: '1', snapshot: mockBirthday }]);
      store.refreshState();
      actions$ = of(BirthdayActions.deleteBirthday({ id: '1' }));

      effects.deleteBirthday$.subscribe(action => {
        expect(action).toEqual(BirthdayActions.deleteBirthdaySuccess({ id: '1', birthday: mockBirthday }));
        expect(offlineStorageMock.deleteBirthday).toHaveBeenCalledWith('1');
        expect(pushNotificationMock.cancelAllNotificationsForBirthday).toHaveBeenCalledWith('1');
        done();
      });
    });

    it('should dispatch deleteBirthdayFailure when birthday is not in optimistic backup', (done) => {
      store.overrideSelector(BirthdaySelectors.selectOptimisticBackup, []);
      store.refreshState();
      actions$ = of(BirthdayActions.deleteBirthday({ id: 'missing-id' }));

      effects.deleteBirthday$.subscribe(action => {
        expect(action).toEqual(BirthdayActions.deleteBirthdayFailure({ error: 'Birthday not found', id: 'missing-id' }));
        expect(offlineStorageMock.deleteBirthday).not.toHaveBeenCalled();
        done();
      });
    });

    it('should handle delete birthday failure', (done) => {
      store.overrideSelector(BirthdaySelectors.selectOptimisticBackup, [{ operationId: '1', entityId: '1', snapshot: mockBirthday }]);
      store.refreshState();
      const error = new Error('Delete failed');
      offlineStorageMock.deleteBirthday.and.returnValue(Promise.reject(error));

      actions$ = of(BirthdayActions.deleteBirthday({ id: '1' }));

      effects.deleteBirthday$.subscribe(action => {
        expect(action).toEqual(BirthdayActions.deleteBirthdayFailure({ error: 'Delete failed', id: '1' }));
        done();
      });
    });

    it('should queue sync change when user is authenticated', (done) => {
      store.overrideSelector(AuthSelectors.selectUserId, 'user-123');
      store.overrideSelector(BirthdaySelectors.selectOptimisticBackup, [{ operationId: '1', entityId: '1', snapshot: mockBirthday }]);
      store.refreshState();

      actions$ = of(BirthdayActions.deleteBirthday({ id: '1' }));

      effects.deleteBirthday$.subscribe(action => {
        expect(action).toEqual(BirthdayActions.deleteBirthdaySuccess({ id: '1', birthday: mockBirthday }));
        expect(syncCoordinatorMock.queueChange).toHaveBeenCalledWith('birthday', '1', 'delete');
        done();
      });
    });

    it('should log a warning and still succeed when photo Storage cleanup rejects', (done) => {
      const birthdayWithPhoto = createMockBirthday({
        id: '1',
        photo: 'https://firebasestorage.googleapis.com/v0/b/proj/o/photo.jpg?alt=media',
      });
      store.overrideSelector(BirthdaySelectors.selectOptimisticBackup, [{ operationId: '1', entityId: '1', snapshot: birthdayWithPhoto }]);
      store.refreshState();
      photoStorageMock.deletePhotoByUrl.and.rejectWith(new Error('Storage error'));

      actions$ = of(BirthdayActions.deleteBirthday({ id: '1' }));

      effects.deleteBirthday$.subscribe(action => {
        expect(action).toEqual(BirthdayActions.deleteBirthdaySuccess({ id: '1', birthday: birthdayWithPhoto }));
        expect(loggerMock.warn).toHaveBeenCalledWith(
          jasmine.stringContaining('[BirthdayCrudEffects]'),
          '1',
          jasmine.any(String),
          jasmine.any(Error)
        );
        done();
      });
    });
  });

  describe('clearAllBirthdays$', () => {
    it('should clear all birthdays successfully', (done) => {
      offlineStorageMock.clear.and.returnValue(Promise.resolve());

      actions$ = of(BirthdayActions.clearAllBirthdays());

      effects.clearAllBirthdays$.subscribe(action => {
        expect(action).toEqual(BirthdayActions.clearAllBirthdaysSuccess());
        expect(offlineStorageMock.clear).toHaveBeenCalled();
        done();
      });
    });

    it('should handle clear all birthdays failure', (done) => {
      const error = new Error('Clear failed');
      offlineStorageMock.clear.and.returnValue(Promise.reject(error));

      actions$ = of(BirthdayActions.clearAllBirthdays());

      effects.clearAllBirthdays$.subscribe(action => {
        expect(action).toEqual(BirthdayActions.clearAllBirthdaysFailure({ error: 'Clear failed' }));
        done();
      });
    });
  });

  describe('importBirthdays$', () => {
    const birthdaysToImport = [
      { name: 'Alice', birthDate: '1990-03-01', category: 'Friends' } as Birthday,
      { name: 'Bob', birthDate: '1985-07-22', category: 'Work' } as Birthday,
    ];

    it('should import birthdays successfully without sync (anonymous user)', (done) => {
      actions$ = of(BirthdayActions.importBirthdays({ birthdays: birthdaysToImport }));

      effects.importBirthdays$.subscribe(action => {
        expect(action.type).toBe(BirthdayActions.importBirthdaysSuccess.type);
        const successAction = action as ReturnType<typeof BirthdayActions.importBirthdaysSuccess>;
        expect(successAction.birthdays.length).toBe(2);
        expect(offlineStorageMock.addBirthdays).toHaveBeenCalled();
        expect(syncCoordinatorMock.queueChange).not.toHaveBeenCalled();
        done();
      });
    });

    it('should queue a sync change per birthday when authenticated', (done) => {
      store.overrideSelector(AuthSelectors.selectUserId, 'user-123');
      store.refreshState();

      actions$ = of(BirthdayActions.importBirthdays({ birthdays: birthdaysToImport }));

      effects.importBirthdays$.subscribe(action => {
        expect(action.type).toBe(BirthdayActions.importBirthdaysSuccess.type);
        expect(syncCoordinatorMock.queueChange).toHaveBeenCalledTimes(2);
        birthdaysToImport.forEach((_, i) =>
          expect(syncCoordinatorMock.queueChange.calls.argsFor(i)[2]).toBe('create')
        );
        done();
      });
    });

    it('should dispatch importBirthdaysFailure on storage error', (done) => {
      const error = new Error('Import failed');
      offlineStorageMock.addBirthdays.and.returnValue(Promise.reject(error));

      actions$ = of(BirthdayActions.importBirthdays({ birthdays: birthdaysToImport }));

      effects.importBirthdays$.subscribe(action => {
        expect(action).toEqual(BirthdayActions.importBirthdaysFailure({ error: 'Import failed' }));
        done();
      });
    });
  });

  describe('loadTestData$', () => {
    it('should load test data successfully', (done) => {
      actions$ = of(BirthdayActions.loadTestData());

      effects.loadTestData$.subscribe(action => {
        expect(action.type).toBe(BirthdayActions.loadTestDataSuccess.type);
        const successAction = action as ReturnType<typeof BirthdayActions.loadTestDataSuccess>;
        expect(successAction.birthdays.length).toBeGreaterThan(0);
        done();
      });
    });

    it('should dispatch loadTestDataFailure on storage error', (done) => {
      const error = new Error('Save failed');
      offlineStorageMock.saveBirthdays.and.returnValue(Promise.reject(error));

      actions$ = of(BirthdayActions.loadTestData());

      effects.loadTestData$.subscribe(action => {
        expect(action).toEqual(BirthdayActions.loadTestDataFailure({ error: 'Save failed' }));
        done();
      });
    });
  });
});
