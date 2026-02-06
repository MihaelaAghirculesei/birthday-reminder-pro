import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Observable, of } from 'rxjs';
import { Action } from '@ngrx/store';
import { BirthdayEffects } from './birthday.effects';
import * as BirthdayActions from './birthday.actions';
import { IndexedDBStorageService } from '../../services/offline-storage.service';
import { NotificationService } from '../../services/notification.service';
import { GoogleCalendarService } from '../../services/google-calendar.service';
import { PushNotificationService } from '../../services/push-notification.service';
import { IdGeneratorService } from '../../services/id-generator.service';
import { LoggerService } from '../../services/logger.service';
import { SyncCoordinatorService } from '../../services/sync-coordinator.service';
import { Birthday } from '../../../shared/models/birthday.model';

describe('BirthdayEffects', () => {
  let actions$: Observable<Action>;
  let effects: BirthdayEffects;
  let store: MockStore;
  let offlineStorageMock: jasmine.SpyObj<IndexedDBStorageService>;
  let notificationServiceMock: jasmine.SpyObj<NotificationService>;
  let googleCalendarMock: jasmine.SpyObj<GoogleCalendarService>;
  let pushNotificationMock: jasmine.SpyObj<PushNotificationService>;
  let idGeneratorMock: jasmine.SpyObj<IdGeneratorService>;
  let loggerMock: jasmine.SpyObj<LoggerService>;
  let syncCoordinatorMock: jasmine.SpyObj<SyncCoordinatorService>;

  const mockBirthday: Birthday = {
    id: '1',
    name: 'John Doe',
    birthDate: new Date(1990, 0, 15),
    category: 'Family',
    zodiacSign: 'Capricorn'
  };

  const initialState = {
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
      'updateBirthday',
      'deleteBirthday',
      'clear',
      'saveScheduledMessage',
      'getScheduledMessagesByBirthday',
      'updateScheduledMessage',
      'deleteScheduledMessage'
    ]);
    notificationServiceMock = jasmine.createSpyObj('NotificationService', ['show']);
    googleCalendarMock = jasmine.createSpyObj('GoogleCalendarService', [
      'syncBirthdayToCalendar',
      'updateBirthdayInCalendar',
      'deleteBirthdayFromCalendar',
      'isEnabled'
    ], {
      isSignedIn$: of(false)
    });
    pushNotificationMock = jasmine.createSpyObj('PushNotificationService', [
      'scheduleBirthdayNotification',
      'scheduleNotification',
      'cancelAllNotificationsForBirthday',
      'cancelNotification'
    ]);
    idGeneratorMock = jasmine.createSpyObj('IdGeneratorService', ['generateId']);
    loggerMock = jasmine.createSpyObj('LoggerService', ['log', 'info', 'warn', 'error']);
    syncCoordinatorMock = jasmine.createSpyObj('SyncCoordinatorService', ['queueChange', 'processPendingChanges']);

    offlineStorageMock.getBirthdays.and.returnValue(Promise.resolve([]));
    offlineStorageMock.saveScheduledMessage.and.returnValue(Promise.resolve());
    offlineStorageMock.getScheduledMessagesByBirthday.and.returnValue(Promise.resolve([]));
    offlineStorageMock.updateScheduledMessage.and.returnValue(Promise.resolve());
    offlineStorageMock.deleteScheduledMessage.and.returnValue(Promise.resolve());
    googleCalendarMock.syncBirthdayToCalendar.and.returnValue(Promise.resolve(''));
    googleCalendarMock.updateBirthdayInCalendar.and.returnValue(Promise.resolve());
    googleCalendarMock.deleteBirthdayFromCalendar.and.returnValue(Promise.resolve());
    googleCalendarMock.isEnabled.and.returnValue(false);
    idGeneratorMock.generateId.and.returnValue('new-id');
    syncCoordinatorMock.queueChange.and.returnValue(Promise.resolve());

    TestBed.configureTestingModule({
      providers: [
        BirthdayEffects,
        provideMockActions(() => actions$),
        provideMockStore({ initialState }),
        { provide: IndexedDBStorageService, useValue: offlineStorageMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: GoogleCalendarService, useValue: googleCalendarMock },
        { provide: PushNotificationService, useValue: pushNotificationMock },
        { provide: IdGeneratorService, useValue: idGeneratorMock },
        { provide: LoggerService, useValue: loggerMock },
        { provide: SyncCoordinatorService, useValue: syncCoordinatorMock }
      ]
    });

    effects = TestBed.inject(BirthdayEffects);
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
    it('should add birthday successfully', (done) => {
      const newBirthday = { name: 'Jane Doe', birthDate: new Date(1995, 5, 20), category: 'Friends' };
      offlineStorageMock.addBirthday.and.returnValue(Promise.resolve());

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
      const newBirthday = { name: 'Jane Doe', birthDate: new Date(1995, 5, 20), category: 'Friends' };
      const error = new Error('Add failed');
      offlineStorageMock.addBirthday.and.returnValue(Promise.reject(error));

      actions$ = of(BirthdayActions.addBirthday({ birthday: newBirthday as Birthday }));

      effects.addBirthday$.subscribe(action => {
        expect(action).toEqual(BirthdayActions.addBirthdayFailure({ error: 'Add failed' }));
        done();
      });
    });

    it('should sync to Google Calendar when event ID is returned', (done) => {
      const newBirthday = { name: 'Jane Doe', birthDate: new Date(1995, 5, 20), category: 'Friends' };
      googleCalendarMock.isEnabled.and.returnValue(true);
      googleCalendarMock.syncBirthdayToCalendar.and.returnValue(Promise.resolve('event-123'));
      offlineStorageMock.addBirthday.and.returnValue(Promise.resolve());

      actions$ = of(BirthdayActions.addBirthday({ birthday: newBirthday as Birthday }));

      effects.addBirthday$.subscribe(action => {
        expect(action.type).toBe(BirthdayActions.addBirthdaySuccess.type);
        const successAction = action as ReturnType<typeof BirthdayActions.addBirthdaySuccess>;
        expect(successAction.birthday.googleCalendarEventId).toBe('event-123');
        done();
      });
    });
  });

  describe('addBirthdaySuccess$', () => {
    it('should show success notification', (done) => {
      actions$ = of(BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday }));

      effects.addBirthdaySuccess$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith('John Doe added successfully!', 'success');
        done();
      });
    });
  });

  describe('updateBirthday$', () => {
    it('should update birthday successfully', (done) => {
      offlineStorageMock.updateBirthday.and.returnValue(Promise.resolve());

      actions$ = of(BirthdayActions.updateBirthday({ birthday: mockBirthday }));

      effects.updateBirthday$.subscribe(action => {
        expect(action.type).toBe(BirthdayActions.updateBirthdaySuccess.type);
        const successAction = action as ReturnType<typeof BirthdayActions.updateBirthdaySuccess>;
        expect(successAction.birthday.category).toBe('family');
        expect(offlineStorageMock.updateBirthday).toHaveBeenCalled();
        done();
      });
    });

    it('should handle update birthday failure', (done) => {
      const error = new Error('Update failed');
      offlineStorageMock.updateBirthday.and.returnValue(Promise.reject(error));

      actions$ = of(BirthdayActions.updateBirthday({ birthday: mockBirthday }));

      effects.updateBirthday$.subscribe(action => {
        expect(action).toEqual(BirthdayActions.updateBirthdayFailure({ error: 'Update failed' }));
        done();
      });
    });
  });

  describe('updateBirthdaySuccess$', () => {
    it('should show success notification', (done) => {
      actions$ = of(BirthdayActions.updateBirthdaySuccess({ birthday: mockBirthday }));

      effects.updateBirthdaySuccess$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith('John Doe updated successfully!', 'success');
        done();
      });
    });
  });

  describe('deleteBirthday$', () => {
    it('should delete birthday successfully', (done) => {
      offlineStorageMock.getBirthdays.and.returnValue(Promise.resolve([mockBirthday]));
      offlineStorageMock.deleteBirthday.and.returnValue(Promise.resolve());

      actions$ = of(BirthdayActions.deleteBirthday({ id: '1' }));

      effects.deleteBirthday$.subscribe(action => {
        expect(action).toEqual(BirthdayActions.deleteBirthdaySuccess({ id: '1' }));
        expect(offlineStorageMock.deleteBirthday).toHaveBeenCalledWith('1');
        done();
      });
    });

    it('should handle delete birthday failure', (done) => {
      const error = new Error('Delete failed');
      offlineStorageMock.getBirthdays.and.returnValue(Promise.reject(error));

      actions$ = of(BirthdayActions.deleteBirthday({ id: '1' }));

      effects.deleteBirthday$.subscribe(action => {
        expect(action).toEqual(BirthdayActions.deleteBirthdayFailure({ error: 'Delete failed' }));
        done();
      });
    });

    it('should delete birthday from Google Calendar if eventId exists', (done) => {
      const birthdayWithEvent = { ...mockBirthday, googleCalendarEventId: 'event-123' };
      offlineStorageMock.getBirthdays.and.returnValue(Promise.resolve([birthdayWithEvent]));
      offlineStorageMock.deleteBirthday.and.returnValue(Promise.resolve());
      googleCalendarMock.isEnabled.and.returnValue(true);
      googleCalendarMock.deleteBirthdayFromCalendar.and.returnValue(Promise.resolve());

      actions$ = of(BirthdayActions.deleteBirthday({ id: '1' }));

      effects.deleteBirthday$.subscribe(action => {
        expect(action).toEqual(BirthdayActions.deleteBirthdaySuccess({ id: '1' }));
        expect(googleCalendarMock.deleteBirthdayFromCalendar).toHaveBeenCalledWith('event-123');
        expect(offlineStorageMock.deleteBirthday).toHaveBeenCalledWith('1');
        done();
      });
    });
  });

  describe('deleteBirthdaySuccess$', () => {
    it('should show success notification', (done) => {
      actions$ = of(BirthdayActions.deleteBirthdaySuccess({ id: '1' }));

      effects.deleteBirthdaySuccess$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith('Birthday deleted successfully!', 'success');
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

  describe('addMessageToBirthday$', () => {
    it('should add message to birthday successfully', (done) => {
      const message = {
        id: 'msg1',
        birthdayId: '1',
        title: 'Test',
        message: 'Test message',
        scheduledTime: '09:00',
        priority: 'normal' as const,
        active: true,
        messageType: 'text' as const,
        createdDate: new Date()
      };
      offlineStorageMock.saveScheduledMessage.and.returnValue(Promise.resolve());
      offlineStorageMock.getBirthdays.and.returnValue(Promise.resolve([mockBirthday]));
      offlineStorageMock.updateBirthday.and.returnValue(Promise.resolve());

      actions$ = of(BirthdayActions.addMessageToBirthday({ birthdayId: '1', message }));

      effects.addMessageToBirthday$.subscribe(action => {
        expect(action.type).toBe(BirthdayActions.addMessageToBirthdaySuccess.type);
        expect(offlineStorageMock.saveScheduledMessage).toHaveBeenCalledWith(message);
        expect(offlineStorageMock.updateBirthday).toHaveBeenCalled();
        done();
      });
    });

    it('should handle add message failure', (done) => {
      const message = {
        id: 'msg1',
        birthdayId: '1',
        title: 'Test',
        message: 'Test message',
        scheduledTime: '09:00',
        priority: 'normal' as const,
        active: true,
        messageType: 'text' as const,
        createdDate: new Date()
      };
      const error = new Error('Add message failed');
      offlineStorageMock.saveScheduledMessage.and.returnValue(Promise.reject(error));

      actions$ = of(BirthdayActions.addMessageToBirthday({ birthdayId: '1', message }));

      effects.addMessageToBirthday$.subscribe(action => {
        expect(action).toEqual(BirthdayActions.addMessageToBirthdayFailure({
          error: 'Add message failed'
        }));
        done();
      });
    });
  });

  describe('loadTestData$', () => {
    it('should load test data successfully', (done) => {
      offlineStorageMock.addBirthday.and.returnValue(Promise.resolve());

      actions$ = of(BirthdayActions.loadTestData());

      let actionCount = 0;
      let foundSuccess = false;

      effects.loadTestData$.subscribe(action => {
        actionCount++;
        if (action.type === BirthdayActions.loadTestDataSuccess.type) {
          foundSuccess = true;
          const successAction = action as ReturnType<typeof BirthdayActions.loadTestDataSuccess>;
          expect(successAction.birthdays.length).toBeGreaterThan(0);
        }
        if (action.type === BirthdayActions.addBirthday.type) {
          expect(action.type).toBe(BirthdayActions.addBirthday.type);
        }
      }, undefined, () => {
        expect(foundSuccess).toBeTrue();
        expect(actionCount).toBeGreaterThan(1);
        done();
      });
    });
  });

  describe('loadTestDataSuccess$', () => {
    it('should show success notification for test data', (done) => {
      const birthdays = [mockBirthday];
      actions$ = of(BirthdayActions.loadTestDataSuccess({ birthdays }));

      effects.loadTestDataSuccess$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith(
          '1 test birthdays loaded successfully!',
          'success'
        );
        done();
      });
    });

    it('should show correct plural form', (done) => {
      const birthdays = [mockBirthday, { ...mockBirthday, id: '2' }];
      actions$ = of(BirthdayActions.loadTestDataSuccess({ birthdays }));

      effects.loadTestDataSuccess$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith(
          '2 test birthdays loaded successfully!',
          'success'
        );
        done();
      });
    });
  });
});
