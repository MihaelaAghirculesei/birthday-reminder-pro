import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideEffects } from '@ngrx/effects';
import { provideStore, Store } from '@ngrx/store';
import type { MockedObject } from 'vitest';

import { GoogleCalendarService } from '../../core/services/google-calendar.service';
import { IdGeneratorService } from '../../core/services/id-generator.service';
import { LoggerService, SILENT_LOGGING } from '../../core/services/logger.service';
import { NotificationService } from '../../core/services/notification.service';
import { IndexedDBStorageService } from '../../core/services/offline-storage.service';
import { PushNotificationService } from '../../core/services/push-notification.service';
import { SyncCoordinatorService } from '../../core/services/sync-coordinator.service';
import { authReducer } from '../../core/store/auth/auth.reducer';
import * as BirthdayActions from '../../core/store/birthday/birthday.actions';
import { birthdayReducer } from '../../core/store/birthday/birthday.reducer';
import * as BirthdaySelectors from '../../core/store/birthday/birthday.selectors';
import { BirthdayCrudEffects } from '../../core/store/birthday/birthday-crud.effects';
import { type Birthday } from '../../shared/models/birthday.model';
import { provideTranslateTesting } from '../translate-testing';

describe('Birthday CRUD Integration', () => {
  let store: Store;
  let mockStorage: MockedObject<IndexedDBStorageService>;
  let storedBirthdays: Birthday[] = [];

  beforeEach(() => {
    [
      BirthdaySelectors.selectBirthdayState,
      BirthdaySelectors.selectAllBirthdays,
      BirthdaySelectors.selectBirthdayEntities,
      BirthdaySelectors.selectBirthdayTotal
    ].forEach(s => {
      s.release();
      (s as {
        clearResult?: () => void;
      }).clearResult?.();
    });

    storedBirthdays = [];

    mockStorage = {
      getBirthdays: vi.fn().mockName('IndexedDBStorageService.getBirthdays'),
      addBirthday: vi.fn().mockName('IndexedDBStorageService.addBirthday'),
      updateBirthday: vi.fn().mockName('IndexedDBStorageService.updateBirthday'),
      deleteBirthday: vi.fn().mockName('IndexedDBStorageService.deleteBirthday'),
      clear: vi.fn().mockName('IndexedDBStorageService.clear'),
      saveScheduledMessage: vi.fn().mockName('IndexedDBStorageService.saveScheduledMessage'),
      deleteScheduledMessage: vi.fn().mockName('IndexedDBStorageService.deleteScheduledMessage'),
      getScheduledMessagesByBirthday: vi.fn().mockName('IndexedDBStorageService.getScheduledMessagesByBirthday')
    } as unknown as MockedObject<IndexedDBStorageService>;

    mockStorage.getBirthdays.mockImplementation(() => Promise.resolve([...storedBirthdays]));
    mockStorage.addBirthday.mockImplementation((b: Birthday) => {
      storedBirthdays.push(b);
      return Promise.resolve();
    });
    mockStorage.updateBirthday.mockImplementation((b: Birthday) => {
      const index = storedBirthdays.findIndex(x => x.id === b.id);
      if (index >= 0)
        storedBirthdays[index] = b;
      return Promise.resolve();
    });
    mockStorage.deleteBirthday.mockImplementation((id: string) => {
      storedBirthdays = storedBirthdays.filter(b => b.id !== id);
      return Promise.resolve();
    });
    mockStorage.clear.mockImplementation(() => {
      storedBirthdays = [];
      return Promise.resolve();
    });
    mockStorage.getScheduledMessagesByBirthday.mockReturnValue(Promise.resolve([]));

    const mockNotification = {
      show: vi.fn().mockName('NotificationService.show')
    };
    const mockPushNotification = {
      scheduleNotification: vi.fn().mockName('PushNotificationService.scheduleNotification'),
      cancelNotification: vi.fn().mockName('PushNotificationService.cancelNotification'),
      cancelAllNotificationsForBirthday: vi.fn().mockName('PushNotificationService.cancelAllNotificationsForBirthday')
    };
    const mockGoogleCalendar = {
      isEnabled: vi.fn().mockName('GoogleCalendarService.isEnabled'),
      syncBirthdayToCalendar: vi.fn().mockName('GoogleCalendarService.syncBirthdayToCalendar'),
      updateBirthdayInCalendar: vi.fn().mockName('GoogleCalendarService.updateBirthdayInCalendar'),
      deleteBirthdayFromCalendar: vi.fn().mockName('GoogleCalendarService.deleteBirthdayFromCalendar')
    };
    mockGoogleCalendar.isEnabled.mockReturnValue(false);

    const mockSyncCoordinator = {
      queueChange: vi.fn().mockName('SyncCoordinatorService.queueChange')
    };
    mockSyncCoordinator.queueChange.mockReturnValue(Promise.resolve());

    TestBed.configureTestingModule({
      providers: [
        provideStore({ birthdays: birthdayReducer, auth: authReducer }),
        provideEffects([BirthdayCrudEffects]),
        IdGeneratorService,
        LoggerService,
        { provide: SILENT_LOGGING, useValue: true },
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IndexedDBStorageService, useValue: mockStorage },
        { provide: NotificationService, useValue: mockNotification },
        { provide: PushNotificationService, useValue: mockPushNotification },
        { provide: GoogleCalendarService, useValue: mockGoogleCalendar },
        { provide: SyncCoordinatorService, useValue: mockSyncCoordinator },
        provideTranslateTesting()
      ]
    });

    store = TestBed.inject(Store);
  });

  it('should complete full CRUD cycle', async () => {
    vi.useFakeTimers();
    const newBirthday = {
      name: 'Integration Test User',
      birthDate: '1990-06-15',
      category: 'friends',
      notes: 'Test notes'
    };

    store.dispatch(BirthdayActions.addBirthday({ birthday: newBirthday }));
    await vi.advanceTimersByTimeAsync(100);

    expect(storedBirthdays.length).toBe(1);
    expect(storedBirthdays[0].name).toBe('Integration Test User');
    const createdId = storedBirthdays[0].id;

    let birthdays: Birthday[] = [];
    store.select(BirthdaySelectors.selectAllBirthdays).subscribe(b => birthdays = b);
    await vi.advanceTimersByTimeAsync(100);

    expect(birthdays.length).toBe(1);
    expect(birthdays[0].id).toBe(createdId);

    const updatedBirthday: Birthday = {
      ...storedBirthdays[0],
      name: 'Updated Name',
      notes: 'Updated notes'
    };
    store.dispatch(BirthdayActions.updateBirthday({ birthday: updatedBirthday, operationId: crypto.randomUUID() }));
    await vi.advanceTimersByTimeAsync(100);

    expect(storedBirthdays[0].name).toBe('Updated Name');
    expect(storedBirthdays[0].notes).toBe('Updated notes');

    store.dispatch(BirthdayActions.deleteBirthday({ id: createdId }));
    await vi.advanceTimersByTimeAsync(100);

    expect(storedBirthdays.length).toBe(0);
  });

  it('should handle multiple birthdays correctly', async () => {
    vi.useFakeTimers();
    const birthdays = [
      { name: 'User A', birthDate: '1990-01-01', category: 'family' },
      { name: 'User B', birthDate: '1991-02-02', category: 'friends' },
      { name: 'User C', birthDate: '1992-03-03', category: 'colleagues' }
    ];

    birthdays.forEach(b => store.dispatch(BirthdayActions.addBirthday({ birthday: b })));
    await vi.advanceTimersByTimeAsync(300);

    expect(storedBirthdays.length).toBe(3);

    const idToDelete = storedBirthdays[1].id;
    store.dispatch(BirthdayActions.deleteBirthday({ id: idToDelete }));
    await vi.advanceTimersByTimeAsync(100);

    expect(storedBirthdays.length).toBe(2);
    expect(storedBirthdays.find(b => b.id === idToDelete)).toBeUndefined();
  });

  it('should clear all birthdays', async () => {
    vi.useFakeTimers();
    store.dispatch(BirthdayActions.addBirthday({ birthday: { name: 'User 1', birthDate: '2000-01-01', category: 'family' } }));
    store.dispatch(BirthdayActions.addBirthday({ birthday: { name: 'User 2', birthDate: '2000-01-01', category: 'friends' } }));
    await vi.advanceTimersByTimeAsync(200);

    expect(storedBirthdays.length).toBe(2);

    store.dispatch(BirthdayActions.clearAllBirthdays());
    await vi.advanceTimersByTimeAsync(100);

    expect(storedBirthdays.length).toBe(0);
  });

  it('should assign zodiac sign automatically', async () => {
    vi.useFakeTimers();
    store.dispatch(BirthdayActions.addBirthday({
      birthday: {
        name: 'Leo Person',
        birthDate: '1990-08-10',
        category: 'friends'
      }
    }));
    await vi.advanceTimersByTimeAsync(100);

    expect(storedBirthdays[0].zodiacSign).toBe('Leo');
  });

  it('should generate unique IDs', async () => {
    vi.useFakeTimers();
    store.dispatch(BirthdayActions.addBirthday({ birthday: { name: 'User 1', birthDate: '2000-01-01', category: 'family' } }));
    store.dispatch(BirthdayActions.addBirthday({ birthday: { name: 'User 2', birthDate: '2000-02-02', category: 'family' } }));
    await vi.advanceTimersByTimeAsync(200);

    expect(storedBirthdays[0].id).toBeDefined();
    expect(storedBirthdays[1].id).toBeDefined();
    expect(storedBirthdays[0].id).not.toBe(storedBirthdays[1].id);
  });
});
