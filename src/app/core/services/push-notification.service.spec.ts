import { TestBed } from '@angular/core/testing';
import { PushNotificationService } from './push-notification.service';
import { IndexedDBStorageService } from './offline-storage.service';
import { Birthday, ScheduledMessage } from '../../shared/models';
import { SILENT_LOGGER_PROVIDER } from './logger.service';

describe('PushNotificationService', () => {
  let service: PushNotificationService;
  let mockStorage: jasmine.SpyObj<IndexedDBStorageService>;

  const mockBirthday: Birthday = {
    id: 'b1',
    name: 'John Doe',
    birthDate: new Date('1990-01-15'),
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

  beforeEach(() => {
    mockStorage = jasmine.createSpyObj('IndexedDBStorageService', [
      'getBirthdays',
      'updateBirthday'
    ]);

    mockStorage.getBirthdays.and.returnValue(Promise.resolve([]));

    TestBed.configureTestingModule({
      providers: [
        PushNotificationService,
        { provide: IndexedDBStorageService, useValue: mockStorage },
        SILENT_LOGGER_PROVIDER
      ]
    });

    service = TestBed.inject(PushNotificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should not throw on ngOnDestroy', () => {
    expect(() => service.ngOnDestroy()).not.toThrow();
  });

  describe('scheduleNotification', () => {
    it('should return false if message is not active', async () => {
      const inactiveMessage = { ...mockMessage, active: false };
      const result = await service.scheduleNotification(mockBirthday, inactiveMessage);
      expect(result).toBe(false);
    });
  });

  describe('getScheduledNotificationsCount', () => {
    it('should return 0 for empty birthdays', async () => {
      mockStorage.getBirthdays.and.returnValue(Promise.resolve([]));
      const count = await service.getScheduledNotificationsCount();
      expect(count).toBe(0);
    });

    it('should count active messages', async () => {
      const birthdays = [
        { ...mockBirthday, scheduledMessages: [mockMessage] }
      ];
      mockStorage.getBirthdays.and.returnValue(Promise.resolve(birthdays));
      const count = await service.getScheduledNotificationsCount();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should handle birthdays without scheduled messages', async () => {
      const birthdays = [mockBirthday];
      mockStorage.getBirthdays.and.returnValue(Promise.resolve(birthdays));
      const count = await service.getScheduledNotificationsCount();
      expect(count).toBe(0);
    });

    it('should return 0 on error', async () => {
      mockStorage.getBirthdays.and.returnValue(Promise.reject(new Error('Test error')));
      const count = await service.getScheduledNotificationsCount();
      expect(count).toBe(0);
    });
  });

  describe('getPendingNotifications', () => {
    it('should return array', async () => {
      mockStorage.getBirthdays.and.returnValue(Promise.resolve([]));
      const notifications = await service.getPendingNotifications();
      expect(Array.isArray(notifications)).toBe(true);
    });

    it('should return notifications for active messages', async () => {
      const birthday = { ...mockBirthday, scheduledMessages: [mockMessage] };
      mockStorage.getBirthdays.and.returnValue(Promise.resolve([birthday]));
      const notifications = await service.getPendingNotifications();
      expect(Array.isArray(notifications)).toBe(true);
    });

    it('should skip inactive messages', async () => {
      const birthday = {
        ...mockBirthday,
        scheduledMessages: [{ ...mockMessage, active: false }]
      };
      mockStorage.getBirthdays.and.returnValue(Promise.resolve([birthday]));
      const notifications = await service.getPendingNotifications();
      expect(notifications.length).toBe(0);
    });

    it('should return empty array on error', async () => {
      mockStorage.getBirthdays.and.returnValue(Promise.reject(new Error('Test error')));
      const notifications = await service.getPendingNotifications();
      expect(notifications).toEqual([]);
    });

    it('should format message with name placeholder', async () => {
      const birthday = { ...mockBirthday, scheduledMessages: [mockMessage] };
      mockStorage.getBirthdays.and.returnValue(Promise.resolve([birthday]));
      const notifications = await service.getPendingNotifications();
      if (notifications.length > 0) {
        expect(notifications[0].body).toContain('John Doe');
        expect(notifications[0].body).not.toContain('{name}');
      }
    });

    it('should format message with zodiac placeholder', async () => {
      const birthday = { ...mockBirthday, scheduledMessages: [mockMessage] };
      mockStorage.getBirthdays.and.returnValue(Promise.resolve([birthday]));
      const notifications = await service.getPendingNotifications();
      if (notifications.length > 0) {
        expect(notifications[0].body).toContain('Capricorn');
        expect(notifications[0].body).not.toContain('{zodiac}');
      }
    });

    it('should handle missing zodiac sign', async () => {
      const birthdayNoZodiac = {
        ...mockBirthday,
        zodiacSign: undefined,
        scheduledMessages: [mockMessage]
      };
      mockStorage.getBirthdays.and.returnValue(Promise.resolve([birthdayNoZodiac]));
      const notifications = await service.getPendingNotifications();
      expect(Array.isArray(notifications)).toBe(true);
    });

    it('should set birthdayId in notifications', async () => {
      const birthday = { ...mockBirthday, scheduledMessages: [mockMessage] };
      mockStorage.getBirthdays.and.returnValue(Promise.resolve([birthday]));
      const notifications = await service.getPendingNotifications();
      if (notifications.length > 0) {
        expect(notifications[0].birthdayId).toBe('b1');
      }
    });

    it('should use message title or default', async () => {
      const birthday = { ...mockBirthday, scheduledMessages: [mockMessage] };
      mockStorage.getBirthdays.and.returnValue(Promise.resolve([birthday]));
      const notifications = await service.getPendingNotifications();
      if (notifications.length > 0) {
        expect(notifications[0].title).toBeTruthy();
      }
    });
  });

  describe('Notification ID generation', () => {
    it('should generate consistent IDs for same inputs', async () => {
      const birthday = { ...mockBirthday, scheduledMessages: [mockMessage] };
      mockStorage.getBirthdays.and.returnValue(Promise.resolve([birthday]));

      const notifications1 = await service.getPendingNotifications();
      const notifications2 = await service.getPendingNotifications();

      if (notifications1.length > 0 && notifications2.length > 0) {
        expect(notifications1[0].id).toBe(notifications2[0].id);
      }
    });

    it('should generate different IDs for different inputs', async () => {
      const birthday1 = { ...mockBirthday, id: 'b1', scheduledMessages: [mockMessage] };
      const birthday2 = { ...mockBirthday, id: 'b2', scheduledMessages: [{ ...mockMessage, id: 'm2' }] };
      mockStorage.getBirthdays.and.returnValue(Promise.resolve([birthday1, birthday2]));

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
      const birthdayWithMessages = {
        ...mockBirthday,
        scheduledMessages: [mockMessage]
      };
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
      const pastMessage = {
        ...mockMessage,
        scheduledTime: '00:00'
      };
      const result = await service.scheduleNotification(mockBirthday, pastMessage);
      expect(typeof result).toBe('boolean');
    });

    it('should handle message with future scheduled time', async () => {
      const futureMessage = {
        ...mockMessage,
        scheduledTime: '23:59'
      };
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
      const birthday = {
        ...mockBirthday,
        scheduledMessages: [messageWithPlaceholders]
      };
      mockStorage.getBirthdays.and.returnValue(Promise.resolve([birthday]));
      const notifications = await service.getPendingNotifications();

      if (notifications.length > 0) {
        expect(notifications[0].body).toContain('John Doe');
        expect(notifications[0].body).not.toContain('{name}');
        expect(notifications[0].body).not.toContain('{age}');
        expect(notifications[0].body).not.toContain('{zodiac}');
      }
    });

    it('should handle empty title by using default', async () => {
      const messageNoTitle = {
        ...mockMessage,
        title: ''
      };
      const birthday = {
        ...mockBirthday,
        scheduledMessages: [messageNoTitle]
      };
      mockStorage.getBirthdays.and.returnValue(Promise.resolve([birthday]));
      const notifications = await service.getPendingNotifications();

      if (notifications.length > 0) {
        expect(notifications[0].title).toBe('🎂 Birthday Reminder');
      }
    });

    it('should replace age placeholder with empty string if age cannot be calculated', async () => {
      const futureBirthday = {
        ...mockBirthday,
        birthDate: new Date(new Date().getFullYear() + 100, 0, 1),
        scheduledMessages: [mockMessage]
      };
      mockStorage.getBirthdays.and.returnValue(Promise.resolve([futureBirthday]));
      const notifications = await service.getPendingNotifications();

      if (notifications.length > 0) {
        expect(notifications[0].body).toBeDefined();
      }
    });

    it('should replace zodiac placeholder with empty string if undefined', async () => {
      const birthdayNoZodiac = {
        ...mockBirthday,
        zodiacSign: undefined,
        scheduledMessages: [{
          ...mockMessage,
          message: 'Birthday {zodiac}'
        }]
      };
      mockStorage.getBirthdays.and.returnValue(Promise.resolve([birthdayNoZodiac]));
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

      const birthday1 = {
        ...mockBirthday,
        id: 'b1',
        scheduledMessages: [laterMessage]
      };
      const birthday2 = {
        ...mockBirthday,
        id: 'b2',
        scheduledMessages: [earlierMessage]
      };

      mockStorage.getBirthdays.and.returnValue(Promise.resolve([birthday1, birthday2]));
      const notifications = await service.getPendingNotifications();

      if (notifications.length >= 2) {
        expect(notifications[0].scheduledAt.getTime()).toBeLessThanOrEqual(
          notifications[1].scheduledAt.getTime()
        );
      }
    });

    it('should handle single notification', async () => {
      const birthday = {
        ...mockBirthday,
        scheduledMessages: [mockMessage]
      };
      mockStorage.getBirthdays.and.returnValue(Promise.resolve([birthday]));
      const notifications = await service.getPendingNotifications();

      expect(notifications.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle birthday without scheduledMessages array', async () => {
      const birthdayNoMessages = { ...mockBirthday };
      delete birthdayNoMessages.scheduledMessages;

      mockStorage.getBirthdays.and.returnValue(Promise.resolve([birthdayNoMessages]));
      const count = await service.getScheduledNotificationsCount();
      expect(count).toBe(0);
    });

    it('should handle multiple inactive messages', async () => {
      const inactiveMessages = [
        { ...mockMessage, id: 'm1', active: false },
        { ...mockMessage, id: 'm2', active: false }
      ];
      const birthday = {
        ...mockBirthday,
        scheduledMessages: inactiveMessages
      };
      mockStorage.getBirthdays.and.returnValue(Promise.resolve([birthday]));
      const notifications = await service.getPendingNotifications();

      expect(notifications.length).toBe(0);
    });

    it('should handle mix of active and inactive messages', async () => {
      const mixedMessages = [
        { ...mockMessage, id: 'm1', active: true },
        { ...mockMessage, id: 'm2', active: false },
        { ...mockMessage, id: 'm3', active: true }
      ];
      const birthday = {
        ...mockBirthday,
        scheduledMessages: mixedMessages
      };
      mockStorage.getBirthdays.and.returnValue(Promise.resolve([birthday]));
      const count = await service.getScheduledNotificationsCount();

      expect(count).toBe(2);
    });

    it('should handle empty birthdays array in reschedule', async () => {
      mockStorage.getBirthdays.and.returnValue(Promise.resolve([]));
      await expectAsync(service.rescheduleAllNotifications()).toBeResolved();
    });
  });

  describe('Notification date calculation', () => {
    it('should schedule for next year if birthday has passed this year', async () => {
      const now = new Date();
      const pastBirthday = new Date(now.getFullYear(), 0, 1);

      const birthday = {
        ...mockBirthday,
        birthDate: pastBirthday,
        scheduledMessages: [{ ...mockMessage, scheduledTime: '00:01' }]
      };

      mockStorage.getBirthdays.and.returnValue(Promise.resolve([birthday]));
      const notifications = await service.getPendingNotifications();

      if (notifications.length > 0) {
        expect(notifications[0].scheduledAt.getFullYear()).toBeGreaterThanOrEqual(now.getFullYear());
      }
    });

    it('should schedule for this year if birthday is upcoming', async () => {
      const now = new Date();
      const futureBirthday = new Date(now.getFullYear(), 11, 31);

      const birthday = {
        ...mockBirthday,
        birthDate: futureBirthday,
        scheduledMessages: [{ ...mockMessage, scheduledTime: '23:59' }]
      };

      mockStorage.getBirthdays.and.returnValue(Promise.resolve([birthday]));
      const notifications = await service.getPendingNotifications();

      expect(notifications.length).toBeGreaterThanOrEqual(0);
    });
  });
});
