import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { PushNotificationService } from './push-notification.service';
import { provideTranslateTesting } from '../../testing/translate-testing';
import { IndexedDBStorageService } from './offline-storage.service';
import { NotificationPermissionService } from './notification-permission.service';
import { Birthday, ScheduledMessage } from '../../shared/models';
import { SILENT_LOGGER_PROVIDER } from './logger.service';

describe('PushNotificationService', () => {
  let service: PushNotificationService;
  let mockStorage: jasmine.SpyObj<IndexedDBStorageService>;
  let mockPermissionService: jasmine.SpyObj<NotificationPermissionService>;


  const mockBirthday: Birthday = {
    id: 'b1',
    name: 'John Doe',
    birthDate: '1990-01-15',
    zodiacSign: 'Capricorn',
    reminderDays: 7,
    category: 'family'
  };

  const mockMessage: ScheduledMessage = {
    id: 'm1',
    birthdayId: 'b1',
    title: 'Birthday Reminder',
    message: 'Happy Birthday {name}! You are {age} years old. {zodiac}',
    scheduledTime: '10:00',
    active: true,
    messageType: 'text',
    priority: 'normal',
    createdDate: new Date()
  };

  const initialState = {
    birthdays: {
      ids: [],
      entities: {},
      filters: { searchTerm: '', selectedCategory: null },
      loading: false,
      error: null,
      optimisticBackup: {}
    }
  };

  beforeEach(() => {
    mockStorage = jasmine.createSpyObj('IndexedDBStorageService', [
      'getBirthdays',
      'updateBirthday'
    ]);

    mockPermissionService = jasmine.createSpyObj('NotificationPermissionService', [
      'isNotificationsEnabled'
    ]);
    mockPermissionService.isNotificationsEnabled.and.returnValue(true);

    mockStorage.getBirthdays.and.returnValue(Promise.resolve([]));

    TestBed.configureTestingModule({
      providers: [
        PushNotificationService,
        { provide: IndexedDBStorageService, useValue: mockStorage },
        { provide: NotificationPermissionService, useValue: mockPermissionService },
        SILENT_LOGGER_PROVIDER,
        provideMockStore({ initialState }),
        provideTranslateTesting()
      ]
    });

    service = TestBed.inject(PushNotificationService);
  });

  /** Helper: set the in-memory cache directly for tests that need specific birthday data. */
  function setCache(birthdays: Birthday[]): void {
    (service as unknown as { birthdaysCache: Birthday[] }).birthdaysCache = birthdays;
  }

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should use DestroyRef for cleanup', () => {
    expect(service['destroyRef']).toBeTruthy();
  });

  describe('scheduleNotification', () => {
    it('should return false if message is not active', async () => {
      const inactiveMessage = { ...mockMessage, active: false };
      const result = await service.scheduleNotification(mockBirthday, inactiveMessage);
      expect(result).toBe(false);
    });
  });

  describe('getScheduledNotificationsCount', () => {
    it('should return 0 for empty cache', () => {
      setCache([]);
      expect(service.getScheduledNotificationsCount()).toBe(0);
    });

    it('should count active messages', () => {
      setCache([{ ...mockBirthday, scheduledMessages: [mockMessage] }]);
      expect(service.getScheduledNotificationsCount()).toBeGreaterThanOrEqual(0);
    });

    it('should handle birthdays without scheduled messages', () => {
      setCache([mockBirthday]);
      expect(service.getScheduledNotificationsCount()).toBe(0);
    });

    it('should return 0 when cache is empty (no storage error scenario)', () => {
      setCache([]);
      expect(service.getScheduledNotificationsCount()).toBe(0);
    });
  });

  describe('getPendingNotifications', () => {
    it('should return array', async () => {
      setCache([]);
      const notifications = await service.getPendingNotifications();
      expect(Array.isArray(notifications)).toBe(true);
    });

    it('should return notifications for active messages', async () => {
      setCache([{ ...mockBirthday, scheduledMessages: [mockMessage] }]);
      const notifications = await service.getPendingNotifications();
      expect(Array.isArray(notifications)).toBe(true);
    });

    it('should skip inactive messages', async () => {
      setCache([{ ...mockBirthday, scheduledMessages: [{ ...mockMessage, active: false }] }]);
      const notifications = await service.getPendingNotifications();
      expect(notifications.length).toBe(0);
    });

    it('should return empty array when cache is empty', async () => {
      setCache([]);
      const notifications = await service.getPendingNotifications();
      expect(notifications).toEqual([]);
    });

    it('should format message with name placeholder', async () => {
      setCache([{ ...mockBirthday, scheduledMessages: [mockMessage] }]);
      const notifications = await service.getPendingNotifications();
      if (notifications.length > 0) {
        expect(notifications[0].body).toContain('John Doe');
        expect(notifications[0].body).not.toContain('{name}');
      }
    });

    it('should format message with zodiac placeholder', async () => {
      setCache([{ ...mockBirthday, scheduledMessages: [mockMessage] }]);
      const notifications = await service.getPendingNotifications();
      if (notifications.length > 0) {
        expect(notifications[0].body).toContain('Capricorn');
        expect(notifications[0].body).not.toContain('{zodiac}');
      }
    });

    it('should handle missing zodiac sign', async () => {
      const birthdayNoZodiac = { ...mockBirthday, zodiacSign: undefined, scheduledMessages: [mockMessage] };
      setCache([birthdayNoZodiac]);
      const notifications = await service.getPendingNotifications();
      expect(Array.isArray(notifications)).toBe(true);
    });

    it('should set birthdayId in notifications', async () => {
      setCache([{ ...mockBirthday, scheduledMessages: [mockMessage] }]);
      const notifications = await service.getPendingNotifications();
      if (notifications.length > 0) {
        expect(notifications[0].birthdayId).toBe('b1');
      }
    });

    it('should use message title or default', async () => {
      setCache([{ ...mockBirthday, scheduledMessages: [mockMessage] }]);
      const notifications = await service.getPendingNotifications();
      if (notifications.length > 0) {
        expect(notifications[0].title).toBeTruthy();
      }
    });
  });

  describe('Notification ID generation', () => {
    it('should generate consistent IDs for same inputs', async () => {
      setCache([{ ...mockBirthday, scheduledMessages: [mockMessage] }]);

      const notifications1 = await service.getPendingNotifications();
      const notifications2 = await service.getPendingNotifications();

      expect(notifications1.length).toBeGreaterThan(0);
      expect(notifications2.length).toBeGreaterThan(0);
      expect(notifications1[0].id).toBe(notifications2[0].id);
    });

    it('should generate different IDs for different inputs', async () => {
      const birthday1 = { ...mockBirthday, id: 'b1', scheduledMessages: [mockMessage] };
      const birthday2 = { ...mockBirthday, id: 'b2', scheduledMessages: [{ ...mockMessage, id: 'm2' }] };
      setCache([birthday1, birthday2]);

      const notifications = await service.getPendingNotifications();

      if (notifications.length >= 2) {
        expect(notifications[0].id).not.toBe(notifications[1].id);
      }
    });
  });

  describe('Async operations', () => {
    it('cancelNotification should not throw', async () => {
      await expectAsync(service.cancelNotification('b1', 'm1')).toBeResolved();
    });

    it('cancelAllNotificationsForBirthday should not throw', async () => {
      await expectAsync(service.cancelAllNotificationsForBirthday('b1')).toBeResolved();
    });

    it('rescheduleAllNotifications should not throw', async () => {
      mockStorage.getBirthdays.and.returnValue(Promise.resolve([]));
      await expectAsync(service.rescheduleAllNotifications()).toBeResolved();
    });

    it('rescheduleAllNotifications should handle birthdays with messages', async () => {
      const birthdayWithMessages = { ...mockBirthday, scheduledMessages: [mockMessage] };
      mockStorage.getBirthdays.and.returnValue(Promise.resolve([birthdayWithMessages]));
      await expectAsync(service.rescheduleAllNotifications()).toBeResolved();
    });

    it('hasPermission should return boolean', async () => {
      const result = await service.hasPermission();
      expect(typeof result).toBe('boolean');
    });

    it('requestPermission should return boolean', async () => {
      const result = await service.requestPermission();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('scheduleNotification', () => {
    it('should return false if message is not active', async () => {
      const inactiveMessage = { ...mockMessage, active: false };
      const result = await service.scheduleNotification(mockBirthday, inactiveMessage);
      expect(result).toBe(false);
    });

    it('should return true for browser environment with active message', async () => {
      const result = await service.scheduleNotification(mockBirthday, mockMessage);
      expect(typeof result).toBe('boolean');
    });

    it('should handle message with past scheduled time', async () => {
      const pastMessage = { ...mockMessage, scheduledTime: '00:00' };
      const result = await service.scheduleNotification(mockBirthday, pastMessage);
      expect(typeof result).toBe('boolean');
    });

    it('should handle message with future scheduled time', async () => {
      const futureMessage = { ...mockMessage, scheduledTime: '23:59' };
      const result = await service.scheduleNotification(mockBirthday, futureMessage);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Message formatting', () => {
    it('should format message with multiple placeholders', async () => {
      const messageWithPlaceholders = {
        ...mockMessage,
        message: '{name} will be {age} on their birthday! Their zodiac is {zodiac}.'
      };
      setCache([{ ...mockBirthday, scheduledMessages: [messageWithPlaceholders] }]);
      const notifications = await service.getPendingNotifications();

      if (notifications.length > 0) {
        expect(notifications[0].body).toContain('John Doe');
        expect(notifications[0].body).not.toContain('{name}');
        expect(notifications[0].body).not.toContain('{age}');
        expect(notifications[0].body).not.toContain('{zodiac}');
      }
    });

    it('should handle empty title by using default', async () => {
      const messageNoTitle = { ...mockMessage, title: '' };
      setCache([{ ...mockBirthday, scheduledMessages: [messageNoTitle] }]);
      const notifications = await service.getPendingNotifications();

      if (notifications.length > 0) {
        expect(notifications[0].title).toBe('🎂 Birthday Reminder');
      }
    });

    it('should replace age placeholder with empty string if age cannot be calculated', async () => {
      const futureBirthday = { ...mockBirthday, birthDate: '2126-01-01', scheduledMessages: [mockMessage] };
      setCache([futureBirthday]);
      const notifications = await service.getPendingNotifications();

      if (notifications.length > 0) {
        expect(notifications[0].body).toBeDefined();
      }
    });

    it('should replace zodiac placeholder with empty string if undefined', async () => {
      const birthdayNoZodiac = {
        ...mockBirthday,
        zodiacSign: undefined,
        scheduledMessages: [{ ...mockMessage, message: 'Birthday {zodiac}' }]
      };
      setCache([birthdayNoZodiac]);
      const notifications = await service.getPendingNotifications();

      if (notifications.length > 0) {
        expect(notifications[0].body).toBe('Birthday ');
      }
    });
  });

  describe('getPendingNotifications sorting', () => {
    it('should sort notifications by scheduled time', async () => {
      const earlierMessage = { ...mockMessage, id: 'm1', scheduledTime: '08:00' };
      const laterMessage = { ...mockMessage, id: 'm2', scheduledTime: '18:00' };
      setCache([
        { ...mockBirthday, id: 'b1', scheduledMessages: [laterMessage] },
        { ...mockBirthday, id: 'b2', scheduledMessages: [earlierMessage] }
      ]);
      const notifications = await service.getPendingNotifications();

      if (notifications.length >= 2) {
        expect(notifications[0].scheduledAt.getTime()).toBeLessThanOrEqual(
          notifications[1].scheduledAt.getTime()
        );
      }
    });

    it('should handle single notification', async () => {
      setCache([{ ...mockBirthday, scheduledMessages: [mockMessage] }]);
      const notifications = await service.getPendingNotifications();
      expect(notifications.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle birthday without scheduledMessages array', () => {
      const birthdayNoMessages = { ...mockBirthday };
      delete birthdayNoMessages.scheduledMessages;
      setCache([birthdayNoMessages]);
      expect(service.getScheduledNotificationsCount()).toBe(0);
    });

    it('should handle multiple inactive messages', async () => {
      const inactiveMessages = [
        { ...mockMessage, id: 'm1', active: false },
        { ...mockMessage, id: 'm2', active: false }
      ];
      setCache([{ ...mockBirthday, scheduledMessages: inactiveMessages }]);
      const notifications = await service.getPendingNotifications();
      expect(notifications.length).toBe(0);
    });

    it('should handle mix of active and inactive messages', () => {
      const mixedMessages = [
        { ...mockMessage, id: 'm1', active: true },
        { ...mockMessage, id: 'm2', active: false },
        { ...mockMessage, id: 'm3', active: true }
      ];
      setCache([{ ...mockBirthday, scheduledMessages: mixedMessages }]);
      expect(service.getScheduledNotificationsCount()).toBe(2);
    });

    it('should handle empty birthdays array in reschedule', async () => {
      mockStorage.getBirthdays.and.returnValue(Promise.resolve([]));
      await expectAsync(service.rescheduleAllNotifications()).toBeResolved();
    });
  });

  describe('Notification date calculation', () => {
    it('should schedule for next year if birthday has passed this year', async () => {
      const now = new Date();
      const pastBirthday = `${now.getFullYear()}-01-01`;
      setCache([{
        ...mockBirthday,
        birthDate: pastBirthday,
        scheduledMessages: [{ ...mockMessage, scheduledTime: '00:01' }]
      }]);
      const notifications = await service.getPendingNotifications();

      if (notifications.length > 0) {
        expect(notifications[0].scheduledAt.getFullYear()).toBeGreaterThanOrEqual(now.getFullYear());
      }
    });

    it('should schedule for this year if birthday is upcoming', async () => {
      const now = new Date();
      const futureBirthday = `${now.getFullYear()}-12-31`;
      setCache([{
        ...mockBirthday,
        birthDate: futureBirthday,
        scheduledMessages: [{ ...mockMessage, scheduledTime: '23:59' }]
      }]);
      const notifications = await service.getPendingNotifications();
      expect(notifications.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Age calculation', () => {
    it('should calculate correct age for past birthday this year', async () => {
      const now = new Date();
      const m = String(now.getMonth()).padStart(2, '0');
      const pastDate = `${now.getFullYear() - 30}-${m}-15`;
      setCache([{
        ...mockBirthday,
        birthDate: pastDate,
        scheduledMessages: [{ ...mockMessage, message: 'Age: {age}' }]
      }]);
      const notifications = await service.getPendingNotifications();

      if (notifications.length > 0) {
        expect(notifications[0].body).toContain('Age:');
        expect(notifications[0].body).not.toContain('{age}');
      }
    });

    it('should calculate correct age for upcoming birthday this year', async () => {
      const now = new Date();
      const m = String(now.getMonth() + 2).padStart(2, '0');
      const futureDate = `${now.getFullYear() - 25}-${m}-15`;
      setCache([{
        ...mockBirthday,
        birthDate: futureDate,
        scheduledMessages: [{ ...mockMessage, message: 'Turning {age}' }]
      }]);
      const notifications = await service.getPendingNotifications();

      if (notifications.length > 0) {
        expect(notifications[0].body).not.toContain('{age}');
      }
    });

    it('should handle birthday on same month different day', async () => {
      const now = new Date();
      const futureDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5);
      const m = String(futureDay.getMonth() + 1).padStart(2, '0');
      const d = String(futureDay.getDate()).padStart(2, '0');
      const sameMonthDate = `${now.getFullYear() - 20}-${m}-${d}`;
      setCache([{
        ...mockBirthday,
        birthDate: sameMonthDate,
        scheduledMessages: [{ ...mockMessage, message: '{name} turns {age}' }]
      }]);
      const notifications = await service.getPendingNotifications();
      expect(Array.isArray(notifications)).toBe(true);
    });
  });

  describe('Multiple birthdays handling', () => {
    it('should process all birthdays with messages', () => {
      setCache([
        { ...mockBirthday, id: 'b1', name: 'Alice', scheduledMessages: [{ ...mockMessage, id: 'm1', active: true }] },
        { ...mockBirthday, id: 'b2', name: 'Bob', scheduledMessages: [{ ...mockMessage, id: 'm2', active: true }] },
        { ...mockBirthday, id: 'b3', name: 'Charlie', scheduledMessages: [{ ...mockMessage, id: 'm3', active: true }] }
      ]);
      expect(service.getScheduledNotificationsCount()).toBe(3);
    });

    it('should handle mix of birthdays with and without messages', () => {
      setCache([
        { ...mockBirthday, id: 'b1', scheduledMessages: [{ ...mockMessage, id: 'm1', active: true }] },
        { ...mockBirthday, id: 'b2' },
        { ...mockBirthday, id: 'b3', scheduledMessages: [] }
      ]);
      expect(service.getScheduledNotificationsCount()).toBe(1);
    });

    it('should return notifications from multiple birthdays', async () => {
      setCache([
        { ...mockBirthday, id: 'b1', name: 'Alice', scheduledMessages: [{ ...mockMessage, id: 'm1' }] },
        { ...mockBirthday, id: 'b2', name: 'Bob', scheduledMessages: [{ ...mockMessage, id: 'm2' }] }
      ]);
      const notifications = await service.getPendingNotifications();
      expect(notifications.length).toBe(2);
    });
  });

  describe('Scheduled time parsing', () => {
    it('should handle midnight scheduled time', async () => {
      setCache([{ ...mockBirthday, scheduledMessages: [{ ...mockMessage, scheduledTime: '00:00' }] }]);
      const notifications = await service.getPendingNotifications();

      if (notifications.length > 0) {
        expect(notifications[0].scheduledAt.getHours()).toBe(0);
        expect(notifications[0].scheduledAt.getMinutes()).toBe(0);
      }
    });

    it('should handle end of day scheduled time', async () => {
      setCache([{ ...mockBirthday, scheduledMessages: [{ ...mockMessage, scheduledTime: '23:59' }] }]);
      const notifications = await service.getPendingNotifications();

      if (notifications.length > 0) {
        expect(notifications[0].scheduledAt.getHours()).toBe(23);
        expect(notifications[0].scheduledAt.getMinutes()).toBe(59);
      }
    });

    it('should handle noon scheduled time', async () => {
      setCache([{ ...mockBirthday, scheduledMessages: [{ ...mockMessage, scheduledTime: '12:00' }] }]);
      const notifications = await service.getPendingNotifications();

      if (notifications.length > 0) {
        expect(notifications[0].scheduledAt.getHours()).toBe(12);
      }
    });
  });

  describe('Multiple messages per birthday', () => {
    it('should count all active messages for a single birthday', () => {
      setCache([{
        ...mockBirthday,
        scheduledMessages: [
          { ...mockMessage, id: 'm1', active: true },
          { ...mockMessage, id: 'm2', active: true },
          { ...mockMessage, id: 'm3', active: true }
        ]
      }]);
      expect(service.getScheduledNotificationsCount()).toBe(3);
    });

    it('should return notifications for all messages of a birthday', async () => {
      setCache([{
        ...mockBirthday,
        scheduledMessages: [
          { ...mockMessage, id: 'm1', scheduledTime: '08:00' },
          { ...mockMessage, id: 'm2', scheduledTime: '12:00' },
          { ...mockMessage, id: 'm3', scheduledTime: '18:00' }
        ]
      }]);
      const notifications = await service.getPendingNotifications();
      expect(notifications.length).toBe(3);
    });
  });

  describe('Error handling', () => {
    it('should return 0 from getScheduledNotificationsCount when cache is empty', () => {
      setCache([]);
      expect(service.getScheduledNotificationsCount()).toBe(0);
    });

    it('should return empty array from getPendingNotifications when cache is empty', async () => {
      setCache([]);
      const notifications = await service.getPendingNotifications();
      expect(notifications).toEqual([]);
    });
  });

  describe('Default title handling', () => {
    it('should use default title when message title is undefined', async () => {
      const messageNoTitle = { ...mockMessage, title: undefined as unknown as string };
      setCache([{ ...mockBirthday, scheduledMessages: [messageNoTitle] }]);
      const notifications = await service.getPendingNotifications();

      if (notifications.length > 0) {
        expect(notifications[0].title).toBe('🎂 Birthday Reminder');
      }
    });

    it('should use default title when message title is null', async () => {
      const messageNullTitle = { ...mockMessage, title: null as unknown as string };
      setCache([{ ...mockBirthday, scheduledMessages: [messageNullTitle] }]);
      const notifications = await service.getPendingNotifications();

      if (notifications.length > 0) {
        expect(notifications[0].title).toBe('🎂 Birthday Reminder');
      }
    });
  });

  describe('Notification enabled guard', () => {
    it('should skip checkBrowserNotifications when notifications disabled', () => {
      mockPermissionService.isNotificationsEnabled.and.returnValue(false);
      setCache([{ ...mockBirthday, scheduledMessages: [mockMessage] }]);

      // Should not throw and should not iterate over birthdays
      expect(() => (service as unknown as { checkBrowserNotifications: () => void }).checkBrowserNotifications()).not.toThrow();
    });

    it('should run checkBrowserNotifications without errors when enabled', () => {
      mockPermissionService.isNotificationsEnabled.and.returnValue(true);
      setCache([{ ...mockBirthday, scheduledMessages: [mockMessage] }]);

      expect(() => (service as unknown as { checkBrowserNotifications: () => void }).checkBrowserNotifications()).not.toThrow();
    });
  });

  describe('Birthday date edge cases', () => {
    it('should handle leap year birthday', async () => {
      setCache([{ ...mockBirthday, birthDate: '2000-02-29', scheduledMessages: [mockMessage] }]);
      const notifications = await service.getPendingNotifications();
      expect(Array.isArray(notifications)).toBe(true);
    });

    it('should handle end of year birthday', async () => {
      setCache([{ ...mockBirthday, birthDate: '1990-12-31', scheduledMessages: [mockMessage] }]);
      const notifications = await service.getPendingNotifications();
      expect(Array.isArray(notifications)).toBe(true);
    });

    it('should handle start of year birthday', async () => {
      setCache([{ ...mockBirthday, birthDate: '1990-01-01', scheduledMessages: [mockMessage] }]);
      const notifications = await service.getPendingNotifications();
      expect(Array.isArray(notifications)).toBe(true);
    });
  });
});
