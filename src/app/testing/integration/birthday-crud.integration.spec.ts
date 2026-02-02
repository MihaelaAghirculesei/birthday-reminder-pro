import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideStore, Store } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { PLATFORM_ID } from '@angular/core';

import { BirthdayFacadeService } from '../../core/services/birthday-facade.service';
import { IndexedDBStorageService } from '../../core/services/offline-storage.service';
import { IdGeneratorService } from '../../core/services/id-generator.service';
import { LoggerService, SILENT_LOGGING } from '../../core/services/logger.service';
import { NotificationService } from '../../core/services/notification.service';
import { PushNotificationService } from '../../core/services/push-notification.service';
import { GoogleCalendarService } from '../../core/services/google-calendar.service';
import { birthdayReducer } from '../../core/store/birthday/birthday.reducer';
import { BirthdayEffects } from '../../core/store/birthday/birthday.effects';
import { Birthday } from '../../shared/models/birthday.model';
import * as BirthdaySelectors from '../../core/store/birthday/birthday.selectors';

describe('Birthday CRUD Integration', () => {
  let facade: BirthdayFacadeService;
  let store: Store;
  let mockStorage: jasmine.SpyObj<IndexedDBStorageService>;
  let storedBirthdays: Birthday[] = [];

  beforeEach(() => {
    storedBirthdays = [];

    mockStorage = jasmine.createSpyObj('IndexedDBStorageService', [
      'getBirthdays',
      'addBirthday',
      'updateBirthday',
      'deleteBirthday',
      'clear',
      'saveScheduledMessage',
      'deleteScheduledMessage',
      'getScheduledMessagesByBirthday'
    ]);

    mockStorage.getBirthdays.and.callFake(() => Promise.resolve([...storedBirthdays]));
    mockStorage.addBirthday.and.callFake((b: Birthday) => {
      storedBirthdays.push(b);
      return Promise.resolve();
    });
    mockStorage.updateBirthday.and.callFake((b: Birthday) => {
      const index = storedBirthdays.findIndex(x => x.id === b.id);
      if (index >= 0) storedBirthdays[index] = b;
      return Promise.resolve();
    });
    mockStorage.deleteBirthday.and.callFake((id: string) => {
      storedBirthdays = storedBirthdays.filter(b => b.id !== id);
      return Promise.resolve();
    });
    mockStorage.clear.and.callFake(() => {
      storedBirthdays = [];
      return Promise.resolve();
    });
    mockStorage.getScheduledMessagesByBirthday.and.returnValue(Promise.resolve([]));

    const mockNotification = jasmine.createSpyObj('NotificationService', ['show']);
    const mockPushNotification = jasmine.createSpyObj('PushNotificationService', [
      'scheduleNotification',
      'cancelNotification',
      'cancelAllNotificationsForBirthday'
    ]);
    const mockGoogleCalendar = jasmine.createSpyObj('GoogleCalendarService', [
      'isEnabled',
      'syncBirthdayToCalendar',
      'updateBirthdayInCalendar',
      'deleteBirthdayFromCalendar'
    ]);
    mockGoogleCalendar.isEnabled.and.returnValue(false);

    TestBed.configureTestingModule({
      providers: [
        provideStore({ birthdays: birthdayReducer }),
        provideEffects([BirthdayEffects]),
        BirthdayFacadeService,
        IdGeneratorService,
        LoggerService,
        { provide: SILENT_LOGGING, useValue: true },
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IndexedDBStorageService, useValue: mockStorage },
        { provide: NotificationService, useValue: mockNotification },
        { provide: PushNotificationService, useValue: mockPushNotification },
        { provide: GoogleCalendarService, useValue: mockGoogleCalendar }
      ]
    });

    store = TestBed.inject(Store);
    facade = TestBed.inject(BirthdayFacadeService);
  });

  it('should complete full CRUD cycle', fakeAsync(() => {
    const newBirthday = {
      name: 'Integration Test User',
      birthDate: new Date(1990, 5, 15),
      category: 'friends',
      notes: 'Test notes'
    };

    facade.addBirthday(newBirthday);
    tick(100);

    expect(storedBirthdays.length).toBe(1);
    expect(storedBirthdays[0].name).toBe('Integration Test User');
    const createdId = storedBirthdays[0].id;

    let birthdays: Birthday[] = [];
    store.select(BirthdaySelectors.selectAllBirthdays).subscribe(b => birthdays = b);
    tick(100);

    expect(birthdays.length).toBe(1);
    expect(birthdays[0].id).toBe(createdId);

    const updatedBirthday: Birthday = {
      ...storedBirthdays[0],
      name: 'Updated Name',
      notes: 'Updated notes'
    };
    facade.updateBirthday(updatedBirthday);
    tick(100);

    expect(storedBirthdays[0].name).toBe('Updated Name');
    expect(storedBirthdays[0].notes).toBe('Updated notes');

    facade.deleteBirthday(createdId);
    tick(100);

    expect(storedBirthdays.length).toBe(0);
  }));

  it('should handle multiple birthdays correctly', fakeAsync(() => {
    const birthdays = [
      { name: 'User A', birthDate: new Date(1990, 0, 1), category: 'family' },
      { name: 'User B', birthDate: new Date(1991, 1, 2), category: 'friends' },
      { name: 'User C', birthDate: new Date(1992, 2, 3), category: 'colleagues' }
    ];

    birthdays.forEach(b => facade.addBirthday(b));
    tick(300);

    expect(storedBirthdays.length).toBe(3);

    const idToDelete = storedBirthdays[1].id;
    facade.deleteBirthday(idToDelete);
    tick(100);

    expect(storedBirthdays.length).toBe(2);
    expect(storedBirthdays.find(b => b.id === idToDelete)).toBeUndefined();
  }));

  it('should clear all birthdays', fakeAsync(() => {
    facade.addBirthday({ name: 'User 1', birthDate: new Date(), category: 'family' });
    facade.addBirthday({ name: 'User 2', birthDate: new Date(), category: 'friends' });
    tick(200);

    expect(storedBirthdays.length).toBe(2);

    facade.clearAllBirthdays();
    tick(100);

    expect(storedBirthdays.length).toBe(0);
  }));

  it('should assign zodiac sign automatically', fakeAsync(() => {
    facade.addBirthday({
      name: 'Leo Person',
      birthDate: new Date(1990, 7, 10),
      category: 'friends'
    });
    tick(100);

    expect(storedBirthdays[0].zodiacSign).toBe('Leo');
  }));

  it('should generate unique IDs', fakeAsync(() => {
    facade.addBirthday({ name: 'User 1', birthDate: new Date(), category: 'family' });
    facade.addBirthday({ name: 'User 2', birthDate: new Date(), category: 'family' });
    tick(200);

    expect(storedBirthdays[0].id).toBeDefined();
    expect(storedBirthdays[1].id).toBeDefined();
    expect(storedBirthdays[0].id).not.toBe(storedBirthdays[1].id);
  }));
});
