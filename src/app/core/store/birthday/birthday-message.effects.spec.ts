import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { type Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { type Observable, of } from 'rxjs';
import type { MockedObject } from 'vitest';

import { createMockBirthday } from '../../../testing/mock-data/birthday-mock.data';
import { provideTranslateTesting } from '../../../testing/translate-testing';
import { IndexedDBStorageService } from '../../services/offline-storage.service';
import { PushNotificationService } from '../../services/push-notification.service';
import { SyncCoordinatorService } from '../../services/sync-coordinator.service';
import * as AuthSelectors from '../auth/auth.selectors';
import * as BirthdayActions from './birthday.actions';
import { selectBirthdayById } from './birthday.selectors';
import { BirthdayMessageEffects } from './birthday-message.effects';

describe('BirthdayMessageEffects', () => {
  let actions$: Observable<Action>;
  let effects: BirthdayMessageEffects;
  let store: MockStore;
  let offlineStorageMock: MockedObject<IndexedDBStorageService>;
  let pushNotificationMock: MockedObject<PushNotificationService>;
  let syncCoordinatorMock: MockedObject<SyncCoordinatorService>;

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
    offlineStorageMock = {
      updateBirthday: vi.fn().mockName('IndexedDBStorageService.updateBirthday'),
      saveScheduledMessage: vi.fn().mockName('IndexedDBStorageService.saveScheduledMessage'),
      getScheduledMessagesByBirthday: vi.fn().mockName('IndexedDBStorageService.getScheduledMessagesByBirthday'),
      updateScheduledMessage: vi.fn().mockName('IndexedDBStorageService.updateScheduledMessage'),
      deleteScheduledMessage: vi.fn().mockName('IndexedDBStorageService.deleteScheduledMessage')
    } as unknown as MockedObject<IndexedDBStorageService>;
    pushNotificationMock = {
      scheduleNotification: vi.fn().mockName('PushNotificationService.scheduleNotification'),
      cancelNotification: vi.fn().mockName('PushNotificationService.cancelNotification')
    } as unknown as MockedObject<PushNotificationService>;
    syncCoordinatorMock = {
      queueChange: vi.fn().mockName('SyncCoordinatorService.queueChange')
    } as unknown as MockedObject<SyncCoordinatorService>;

    offlineStorageMock.saveScheduledMessage.mockReturnValue(Promise.resolve());
    offlineStorageMock.getScheduledMessagesByBirthday.mockReturnValue(Promise.resolve([]));
    offlineStorageMock.updateScheduledMessage.mockReturnValue(Promise.resolve());
    offlineStorageMock.deleteScheduledMessage.mockReturnValue(Promise.resolve());
    offlineStorageMock.updateBirthday.mockReturnValue(Promise.resolve());
    syncCoordinatorMock.queueChange.mockReturnValue(Promise.resolve());

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
    it('should add message to birthday successfully', async () => {
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
      });
    });

    it('should handle add message failure', async () => {
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
      offlineStorageMock.saveScheduledMessage.mockReturnValue(Promise.reject(error));

      actions$ = of(BirthdayActions.addMessageToBirthday({ birthdayId: '1', message }));

      effects.addMessageToBirthday$.subscribe(action => {
        expect(action).toEqual(BirthdayActions.addMessageToBirthdayFailure({
          error: 'Add message failed'
        }));
      });
    });

    it('should dispatch success without updating IDB when birthday is not in the store', async () => {
      store.overrideSelector(selectBirthdayById('1'), undefined);
      store.refreshState();

      const message = {
        id: 'msg1', birthdayId: '1', title: 'Test', message: 'Test message',
        scheduledTime: '09:00', priority: 'normal' as const, active: true, messageType: 'text' as const, createdDate: new Date()
      };
      actions$ = of(BirthdayActions.addMessageToBirthday({ birthdayId: '1', message }));

      effects.addMessageToBirthday$.subscribe(action => {
        expect(action.type).toBe(BirthdayActions.addMessageToBirthdaySuccess.type);
        expect(offlineStorageMock.updateBirthday).not.toHaveBeenCalled();
      });
    });

    it('should default to empty array when birthday has no scheduledMessages', async () => {
      const birthdayNoMessages = createMockBirthday({
        id: '1', scheduledMessages: undefined as unknown as [
        ]
      });
      store.overrideSelector(selectBirthdayById('1'), birthdayNoMessages);
      store.refreshState();

      const message = {
        id: 'msg1', birthdayId: '1', title: 'Test', message: 'Test message',
        scheduledTime: '09:00', priority: 'normal' as const, active: true, messageType: 'text' as const, createdDate: new Date()
      };
      actions$ = of(BirthdayActions.addMessageToBirthday({ birthdayId: '1', message }));

      effects.addMessageToBirthday$.subscribe(action => {
        expect(action.type).toBe(BirthdayActions.addMessageToBirthdaySuccess.type);
        expect(offlineStorageMock.updateBirthday).toHaveBeenCalled();
      });
    });

    it('should queue a sync change when the user is authenticated', async () => {
      store.overrideSelector(AuthSelectors.selectUserId, 'user123');
      store.refreshState();

      const message = {
        id: 'msg1', birthdayId: '1', title: 'Test', message: 'Test message',
        scheduledTime: '09:00', priority: 'normal' as const, active: true, messageType: 'text' as const, createdDate: new Date()
      };
      actions$ = of(BirthdayActions.addMessageToBirthday({ birthdayId: '1', message }));

      effects.addMessageToBirthday$.subscribe(action => {
        expect(action.type).toBe(BirthdayActions.addMessageToBirthdaySuccess.type);
        expect(syncCoordinatorMock.queueChange).toHaveBeenCalledWith('birthday', '1', 'update', expect.any(Object));
      });
    });

    it('should use fallback error text when the rejection is not an Error instance', async () => {
      offlineStorageMock.saveScheduledMessage.mockImplementation(() => Promise.reject({ code: 500 }));

      const message = {
        id: 'msg1', birthdayId: '1', title: 'Test', message: 'Test message',
        scheduledTime: '09:00', priority: 'normal' as const, active: true, messageType: 'text' as const, createdDate: new Date()
      };
      actions$ = of(BirthdayActions.addMessageToBirthday({ birthdayId: '1', message }));

      effects.addMessageToBirthday$.subscribe(action => {
        expect(action).toEqual(BirthdayActions.addMessageToBirthdayFailure({ error: 'Failed to add message' }));
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
      offlineStorageMock.getScheduledMessagesByBirthday.mockReturnValue(Promise.resolve([existingMessage]));
    });

    it('should update message successfully', async () => {
      const updates = { title: 'New Title' };
      actions$ = of(BirthdayActions.updateMessageInBirthday({ birthdayId: '1', messageId: 'msg1', updates }));

      effects.updateMessageInBirthday$.subscribe(action => {
        expect(action.type).toBe(BirthdayActions.updateMessageInBirthdaySuccess.type);
      });
    });

    it('should handle update message failure', async () => {
      const error = new Error('Update failed');
      offlineStorageMock.getScheduledMessagesByBirthday.mockReturnValue(Promise.reject(error));

      actions$ = of(BirthdayActions.updateMessageInBirthday({ birthdayId: '1', messageId: 'msg1', updates: {} }));

      effects.updateMessageInBirthday$.subscribe(action => {
        expect(action).toEqual(BirthdayActions.updateMessageInBirthdayFailure({ error: 'Update failed' }));
      });
    });

    it('should skip store update when birthday has no scheduledMessages', async () => {
      const birthdayNoMessages = createMockBirthday({
        id: '1', scheduledMessages: undefined as unknown as [
        ]
      });
      store.overrideSelector(selectBirthdayById('1'), birthdayNoMessages);
      store.refreshState();

      actions$ = of(BirthdayActions.updateMessageInBirthday({ birthdayId: '1', messageId: 'msg1', updates: { title: 'x' } }));

      effects.updateMessageInBirthday$.subscribe(action => {
        expect(action.type).toBe(BirthdayActions.updateMessageInBirthdaySuccess.type);
        expect(offlineStorageMock.updateBirthday).not.toHaveBeenCalled();
      });
    });

    it('should reschedule notification when the target message exists in birthday.scheduledMessages', async () => {
      const birthdayWithMsg = createMockBirthday({ id: '1', scheduledMessages: [existingMessage] });
      store.overrideSelector(selectBirthdayById('1'), birthdayWithMsg);
      store.refreshState();

      actions$ = of(BirthdayActions.updateMessageInBirthday({ birthdayId: '1', messageId: 'msg1', updates: { title: 'New Title' } }));

      effects.updateMessageInBirthday$.subscribe(action => {
        expect(action.type).toBe(BirthdayActions.updateMessageInBirthdaySuccess.type);
        expect(pushNotificationMock.scheduleNotification).toHaveBeenCalled();
      });
    });

    it('should NOT reschedule notification when target message is absent from birthday.scheduledMessages', async () => {
      const otherMessage = { ...existingMessage, id: 'other-msg' };
      const birthdayWithOther = createMockBirthday({ id: '1', scheduledMessages: [otherMessage] });
      store.overrideSelector(selectBirthdayById('1'), birthdayWithOther);
      store.refreshState();

      actions$ = of(BirthdayActions.updateMessageInBirthday({ birthdayId: '1', messageId: 'msg1', updates: {} }));

      effects.updateMessageInBirthday$.subscribe(action => {
        expect(action.type).toBe(BirthdayActions.updateMessageInBirthdaySuccess.type);
        expect(pushNotificationMock.scheduleNotification).not.toHaveBeenCalled();
      });
    });

    it('should queue a sync change for update when the user is authenticated', async () => {
      store.overrideSelector(AuthSelectors.selectUserId, 'user123');
      store.refreshState();

      actions$ = of(BirthdayActions.updateMessageInBirthday({ birthdayId: '1', messageId: 'msg1', updates: {} }));

      effects.updateMessageInBirthday$.subscribe(action => {
        expect(action.type).toBe(BirthdayActions.updateMessageInBirthdaySuccess.type);
        expect(syncCoordinatorMock.queueChange).toHaveBeenCalledWith('birthday', '1', 'update', expect.any(Object));
      });
    });

    it('should use fallback error text for update when the rejection is not an Error instance', async () => {
      offlineStorageMock.getScheduledMessagesByBirthday.mockImplementation(() => Promise.reject({ code: 500 }));

      actions$ = of(BirthdayActions.updateMessageInBirthday({ birthdayId: '1', messageId: 'msg1', updates: {} }));

      effects.updateMessageInBirthday$.subscribe(action => {
        expect(action).toEqual(BirthdayActions.updateMessageInBirthdayFailure({ error: 'Failed to update message' }));
      });
    });
  });

  describe('deleteMessageFromBirthday$', () => {
    it('should delete message successfully', async () => {
      actions$ = of(BirthdayActions.deleteMessageFromBirthday({ birthdayId: '1', messageId: 'msg1' }));

      effects.deleteMessageFromBirthday$.subscribe(action => {
        expect(action.type).toBe(BirthdayActions.deleteMessageFromBirthdaySuccess.type);
        expect(offlineStorageMock.deleteScheduledMessage).toHaveBeenCalledWith('msg1');
      });
    });

    it('should handle delete message failure', async () => {
      const error = new Error('Delete failed');
      offlineStorageMock.deleteScheduledMessage.mockReturnValue(Promise.reject(error));

      actions$ = of(BirthdayActions.deleteMessageFromBirthday({ birthdayId: '1', messageId: 'msg1' }));

      effects.deleteMessageFromBirthday$.subscribe(action => {
        expect(action).toEqual(BirthdayActions.deleteMessageFromBirthdayFailure({ error: 'Delete failed' }));
      });
    });

    it('should skip store update when birthday has no scheduledMessages', async () => {
      const birthdayNoMessages = createMockBirthday({
        id: '1', scheduledMessages: undefined as unknown as [
        ]
      });
      store.overrideSelector(selectBirthdayById('1'), birthdayNoMessages);
      store.refreshState();

      actions$ = of(BirthdayActions.deleteMessageFromBirthday({ birthdayId: '1', messageId: 'msg1' }));

      effects.deleteMessageFromBirthday$.subscribe(action => {
        expect(action.type).toBe(BirthdayActions.deleteMessageFromBirthdaySuccess.type);
        expect(offlineStorageMock.updateBirthday).not.toHaveBeenCalled();
      });
    });

    it('should queue a sync change for delete when the user is authenticated', async () => {
      store.overrideSelector(AuthSelectors.selectUserId, 'user123');
      store.refreshState();

      actions$ = of(BirthdayActions.deleteMessageFromBirthday({ birthdayId: '1', messageId: 'msg1' }));

      effects.deleteMessageFromBirthday$.subscribe(action => {
        expect(action.type).toBe(BirthdayActions.deleteMessageFromBirthdaySuccess.type);
        expect(syncCoordinatorMock.queueChange).toHaveBeenCalledWith('birthday', '1', 'update', expect.any(Object));
      });
    });

    it('should use fallback error text for delete when the rejection is not an Error instance', async () => {
      offlineStorageMock.deleteScheduledMessage.mockImplementation(() => Promise.reject({ code: 500 }));

      actions$ = of(BirthdayActions.deleteMessageFromBirthday({ birthdayId: '1', messageId: 'msg1' }));

      effects.deleteMessageFromBirthday$.subscribe(action => {
        expect(action).toEqual(BirthdayActions.deleteMessageFromBirthdayFailure({ error: 'Failed to delete message' }));
      });
    });
  });
});
