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
import { createMockBirthday } from '../../../testing/mock-data/birthday-mock.data';
import { selectBirthdayById } from './birthday.selectors';

describe('BirthdayMessageEffects', () => {
  let actions$: Observable<Action>;
  let effects: BirthdayMessageEffects;
  let store: MockStore;
  let offlineStorageMock: jasmine.SpyObj<IndexedDBStorageService>;
  let pushNotificationMock: jasmine.SpyObj<PushNotificationService>;
  let syncCoordinatorMock: jasmine.SpyObj<SyncCoordinatorService>;

  const mockBirthday = createMockBirthday({ id: '1', name: 'John Doe', category: 'Family' });

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

    offlineStorageMock.saveScheduledMessage.and.returnValue(Promise.resolve());
    offlineStorageMock.getScheduledMessagesByBirthday.and.returnValue(Promise.resolve([]));
    offlineStorageMock.updateScheduledMessage.and.returnValue(Promise.resolve());
    offlineStorageMock.deleteScheduledMessage.and.returnValue(Promise.resolve());
    offlineStorageMock.updateBirthday.and.returnValue(Promise.resolve());
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

    // Birthday is read from the store, not from IndexedDB — override the selector
    // so the memoized selector instance matches what the effect will call
    store.overrideSelector(selectBirthdayById('1'), mockBirthday);
    store.refreshState();
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

  describe('updateMessageInBirthday$', () => {
    const existingMessage = {
      id: 'msg1',
      birthdayId: '1',
      title: 'Old Title',
      message: 'Old message',
      scheduledTime: '09:00',
      priority: 'normal' as const,
      active: true,
      messageType: 'text' as const,
      createdDate: new Date()
    };

    beforeEach(() => {
      offlineStorageMock.getScheduledMessagesByBirthday.and.returnValue(Promise.resolve([existingMessage]));
    });

    it('should update message successfully', (done) => {
      const updates = { title: 'New Title' };
      actions$ = of(BirthdayActions.updateMessageInBirthday({ birthdayId: '1', messageId: 'msg1', updates }));

      effects.updateMessageInBirthday$.subscribe(action => {
        expect(action.type).toBe(BirthdayActions.updateMessageInBirthdaySuccess.type);
        done();
      });
    });

    it('should handle update message failure', (done) => {
      const error = new Error('Update failed');
      offlineStorageMock.getScheduledMessagesByBirthday.and.returnValue(Promise.reject(error));

      actions$ = of(BirthdayActions.updateMessageInBirthday({ birthdayId: '1', messageId: 'msg1', updates: {} }));

      effects.updateMessageInBirthday$.subscribe(action => {
        expect(action).toEqual(BirthdayActions.updateMessageInBirthdayFailure({ error: 'Update failed' }));
        done();
      });
    });
  });

  describe('deleteMessageFromBirthday$', () => {
    it('should delete message successfully', (done) => {
      actions$ = of(BirthdayActions.deleteMessageFromBirthday({ birthdayId: '1', messageId: 'msg1' }));

      effects.deleteMessageFromBirthday$.subscribe(action => {
        expect(action.type).toBe(BirthdayActions.deleteMessageFromBirthdaySuccess.type);
        expect(offlineStorageMock.deleteScheduledMessage).toHaveBeenCalledWith('msg1');
        done();
      });
    });

    it('should handle delete message failure', (done) => {
      const error = new Error('Delete failed');
      offlineStorageMock.deleteScheduledMessage.and.returnValue(Promise.reject(error));

      actions$ = of(BirthdayActions.deleteMessageFromBirthday({ birthdayId: '1', messageId: 'msg1' }));

      effects.deleteMessageFromBirthday$.subscribe(action => {
        expect(action).toEqual(BirthdayActions.deleteMessageFromBirthdayFailure({ error: 'Delete failed' }));
        done();
      });
    });
  });
});
