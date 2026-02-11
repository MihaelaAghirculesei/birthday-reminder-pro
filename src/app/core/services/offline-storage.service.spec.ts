import { TestBed } from '@angular/core/testing';
import { IndexedDBStorageService } from './offline-storage.service';
import { Birthday, ScheduledMessage } from '../../shared';
import { SILENT_LOGGER_PROVIDER } from './logger.service';

describe('IndexedDBStorageService', () => {
  let service: IndexedDBStorageService;

  const mockBirthday: Birthday = {
    id: 'test-1',
    name: 'John Doe',
    birthDate: new Date('1990-01-15'),
    zodiacSign: 'Capricorn',
    reminderDays: 7,
    category: 'family'
  };

  const mockBirthday2: Birthday = {
    id: 'test-2',
    name: 'Jane Smith',
    birthDate: new Date('1985-06-20'),
    zodiacSign: 'Gemini',
    reminderDays: 3,
    category: 'friends'
  };

  const mockMessage: ScheduledMessage = {
    id: 'msg-1',
    birthdayId: 'test-1',
    title: 'Test Message',
    message: 'Happy Birthday!',
    scheduledTime: '10:00',
    active: true,
    messageType: 'text',
    priority: 'normal',
    createdDate: new Date()
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SILENT_LOGGER_PROVIDER]
    });
    service = TestBed.inject(IndexedDBStorageService);
  });

  afterEach(async () => {
    try {
      await service.deleteScheduledMessage('msg-1').catch(() => undefined);
      await service.deleteScheduledMessage('msg-2').catch(() => undefined);
      await service.clear().catch(() => undefined);
    } catch {
      // Ignore cleanup errors - database may already be cleared
    }
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Birthday Operations', () => {
    it('should return empty array when no birthdays exist', async () => {
      const birthdays = await service.getBirthdays();
      expect(birthdays).toEqual([]);
    });

    it('should add a birthday and retrieve it', async () => {
      await service.addBirthday(mockBirthday);
      const birthdays = await service.getBirthdays();

      expect(birthdays.length).toBe(1);
      expect(birthdays[0].id).toBe(mockBirthday.id);
      expect(birthdays[0].name).toBe(mockBirthday.name);
      expect(birthdays[0].birthDate).toEqual(mockBirthday.birthDate);
    });

    it('should add multiple birthdays', async () => {
      await service.addBirthday(mockBirthday);
      await service.addBirthday(mockBirthday2);

      const birthdays = await service.getBirthdays();
      expect(birthdays.length).toBe(2);
    });

    it('should save birthdays replacing existing data', async () => {
      await service.addBirthday(mockBirthday);
      await service.saveBirthdays([mockBirthday2]);

      const birthdays = await service.getBirthdays();
      expect(birthdays.length).toBe(1);
      expect(birthdays[0].id).toBe(mockBirthday2.id);
    });

    it('should update an existing birthday', async () => {
      await service.addBirthday(mockBirthday);

      const updated = { ...mockBirthday, name: 'Updated Name' };
      await service.updateBirthday(updated);

      const birthdays = await service.getBirthdays();
      expect(birthdays[0].name).toBe('Updated Name');
    });

    it('should delete a birthday by id', async () => {
      await service.addBirthday(mockBirthday);
      await service.addBirthday(mockBirthday2);

      await service.deleteBirthday(mockBirthday.id);

      const birthdays = await service.getBirthdays();
      expect(birthdays.length).toBe(1);
      expect(birthdays[0].id).toBe(mockBirthday2.id);
    });

    it('should clear all birthdays', async () => {
      await service.addBirthday(mockBirthday);
      await service.addBirthday(mockBirthday2);

      await service.clear();

      const birthdays = await service.getBirthdays();
      expect(birthdays.length).toBe(0);
    });

    it('should preserve birthDate as Date object after retrieval', async () => {
      await service.addBirthday(mockBirthday);
      const birthdays = await service.getBirthdays();

      expect(birthdays[0].birthDate instanceof Date).toBe(true);
      expect(birthdays[0].birthDate.getTime()).toBe(mockBirthday.birthDate.getTime());
    });

    it('should handle saving empty birthdays array', async () => {
      await service.addBirthday(mockBirthday);
      await service.saveBirthdays([]);

      const birthdays = await service.getBirthdays();
      expect(birthdays.length).toBe(0);
    });
  });

  describe('Scheduled Message Operations', () => {
    it('should save a scheduled message', async () => {
      await expectAsync(service.saveScheduledMessage(mockMessage)).toBeResolved();
    });

    it('should get scheduled messages by birthday id', async () => {
      await service.saveScheduledMessage(mockMessage);

      const messages = await service.getScheduledMessagesByBirthday('test-1');
      expect(messages.length).toBe(1);
      expect(messages[0].id).toBe(mockMessage.id);
      expect(messages[0].title).toBe(mockMessage.title);
    });

    it('should return empty array when no messages exist for birthday', async () => {
      const messages = await service.getScheduledMessagesByBirthday('non-existent');
      expect(messages).toEqual([]);
    });

    it('should update a scheduled message', async () => {
      await service.saveScheduledMessage(mockMessage);

      const updated = { ...mockMessage, title: 'Updated Title' };
      await service.updateScheduledMessage(updated);

      const messages = await service.getScheduledMessagesByBirthday('test-1');
      expect(messages[0].title).toBe('Updated Title');
    });

    it('should delete a scheduled message', async () => {
      await service.saveScheduledMessage(mockMessage);
      await service.deleteScheduledMessage(mockMessage.id);

      const messages = await service.getScheduledMessagesByBirthday('test-1');
      expect(messages.length).toBe(0);
    });

    it('should save multiple messages for same birthday', async () => {
      const message2 = { ...mockMessage, id: 'msg-2', title: 'Second Message' };
      await service.saveScheduledMessage(mockMessage);
      await service.saveScheduledMessage(message2);

      const messages = await service.getScheduledMessagesByBirthday('test-1');
      expect(messages.length).toBe(2);
    });

    it('should filter messages by birthday id', async () => {
      const messageForBirthday2 = { ...mockMessage, id: 'msg-2', birthdayId: 'test-2' };
      await service.saveScheduledMessage(mockMessage);
      await service.saveScheduledMessage(messageForBirthday2);

      const messages = await service.getScheduledMessagesByBirthday('test-1');
      expect(messages.length).toBe(1);
      expect(messages[0].birthdayId).toBe('test-1');
    });
  });

  describe('Additional edge cases', () => {
    it('should handle birthday with scheduled messages', async () => {
      const birthdayWithMessages = {
        ...mockBirthday,
        scheduledMessages: [mockMessage]
      };

      await service.addBirthday(birthdayWithMessages);
      const birthdays = await service.getBirthdays();

      expect(birthdays.length).toBe(1);
      expect(birthdays[0].scheduledMessages).toBeDefined();
    });

    it('should handle multiple operations in sequence', async () => {
      await service.addBirthday(mockBirthday);
      await service.saveScheduledMessage(mockMessage);

      const birthdays = await service.getBirthdays();
      const messages = await service.getScheduledMessagesByBirthday('test-1');

      expect(birthdays.length).toBe(1);
      expect(messages.length).toBe(1);
    });

    it('should handle updating non-existent birthday', async () => {
      const result = await service.updateBirthday(mockBirthday);
      expect(result).toBeUndefined();
    });

    it('should handle deleting non-existent birthday', async () => {
      const result = await service.deleteBirthday('non-existent');
      expect(result).toBeUndefined();
    });

    it('should handle saving messages for non-existent birthday', async () => {
      await service.saveScheduledMessage(mockMessage);
      const messages = await service.getScheduledMessagesByBirthday('test-1');
      expect(messages.length).toBe(1);
    });

    it('should handle updating non-existent message', async () => {
      const result = await service.updateScheduledMessage(mockMessage);
      expect(result).toBeUndefined();
    });

    it('should handle deleting non-existent message', async () => {
      const result = await service.deleteScheduledMessage('non-existent');
      expect(result).toBeUndefined();
    });

    it('should preserve other properties when updating birthday', async () => {
      const birthdayWithExtra = {
        ...mockBirthday,
        notes: 'Extra notes',
        photoUrl: 'some-url'
      };

      await service.addBirthday(birthdayWithExtra);
      const updated = { ...birthdayWithExtra, name: 'New Name' };
      await service.updateBirthday(updated);

      const birthdays = await service.getBirthdays();
      expect(birthdays[0].name).toBe('New Name');
      expect(birthdays[0].notes).toBe('Extra notes');
    });
  });
});
