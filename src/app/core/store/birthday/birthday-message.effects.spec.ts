import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Observable, of } from 'rxjs';
import { Action } from '@ngrx/store';
import { BirthdayMessageEffects } from './birthday-message.effects';
import * as BirthdayActions from './birthday.actions';
import { provideTranslateTesting } from '../../../testing/translate-testing';
import { IndexedDBStorageService } from '../../services/offline-storage.service';
import { PushNotificationService } from '../../services/push-notification.service';
import { SyncCoordinatorService } from '../../services/sync-coordinator.service';
import { Birthday } from '../../../shared/models/birthday.model';

describe('BirthdayMessageEffects', () => {
  let actions$: Observable<Action>;
  let effects: BirthdayMessageEffects;
  let store: MockStore;
  let offlineStorageMock: jasmine.SpyObj<IndexedDBStorageService>;
  let pushNotificationMock: jasmine.SpyObj<PushNotificationService>;
  let syncCoordinatorMock: jasmine.SpyObj<SyncCoordinatorService>;

  const mockBirthday: Birthday = {
    id: '1',
    name: 'John Doe',
    birthDate: '1990-01-15',
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
      'updateBirthday',
      'saveScheduledMessage',
      'getScheduledMessagesByBirthday',
      'updateScheduledMessage',
      'deleteScheduledMessage'
    ]);
    pushNotificationMock = jasmine.createSpyObj('PushNotificationService', [
      'scheduleNotification',
      'cancelNotification'
    ]);
    syncCoordinatorMock = jasmine.createSpyObj('SyncCoordinatorService', ['queueChange']);

    offlineStorageMock.getBirthdays.and.returnValue(Promise.resolve([]));
    offlineStorageMock.saveScheduledMessage.and.returnValue(Promise.resolve());
    offlineStorageMock.getScheduledMessagesByBirthday.and.returnValue(Promise.resolve([]));
    offlineStorageMock.updateScheduledMessage.and.returnValue(Promise.resolve());
    offlineStorageMock.deleteScheduledMessage.and.returnValue(Promise.resolve());
    syncCoordinatorMock.queueChange.and.returnValue(Promise.resolve());

    TestBed.configureTestingModule({
      providers: [
        BirthdayMessageEffects,
        provideMockActions(() => actions$),
        provideMockStore({ initialState }),
        { provide: IndexedDBStorageService, useValue: offlineStorageMock },
        { provide: PushNotificationService, useValue: pushNotificationMock },
        { provide: SyncCoordinatorService, useValue: syncCoordinatorMock },
        provideTranslateTesting()
      ]
    });

    effects = TestBed.inject(BirthdayMessageEffects);
    store = TestBed.inject(MockStore);
  });

  afterEach(() => {
    store.resetSelectors();
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
});
