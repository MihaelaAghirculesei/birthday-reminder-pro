import { TestBed } from '@angular/core/testing';
import { IndexedDBStorageService, RETRY_CONFIG } from './offline-storage.service';
import { Birthday, ScheduledMessage } from '../../shared';
import { SILENT_LOGGER_PROVIDER } from './logger.service';
import { provideTranslateTesting } from '../../testing/translate-testing';
import { IndexedDBConnectionService } from './indexeddb-connection.service';
import { IdbDataMigrationService, CURRENT_DATA_VERSION } from './idb-data-migration.service';

describe('IndexedDBStorageService', () => {
  let service: IndexedDBStorageService;

  const mockBirthday: Birthday = {
    id: 'test-1',
    name: 'John Doe',
    birthDate: '1990-01-15',
    zodiacSign: 'Capricorn',
    reminderDays: 7,
    category: 'family'
  };

  const mockBirthday2: Birthday = {
    id: 'test-2',
    name: 'Jane Smith',
    birthDate: '1985-06-20',
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
      providers: [SILENT_LOGGER_PROVIDER, provideTranslateTesting()]
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

    it('should reject when adding a birthday with a duplicate id', async () => {
      await service.addBirthday(mockBirthday);
      await expectAsync(service.addBirthday(mockBirthday)).toBeRejected();
    });

    it('should preserve birthDate as YYYY-MM-DD string after retrieval', async () => {
      await service.addBirthday(mockBirthday);
      const birthdays = await service.getBirthdays();

      expect(typeof birthdays[0].birthDate).toBe('string');
      expect(birthdays[0].birthDate).toBe(mockBirthday.birthDate);
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

  describe('RETRY_CONFIG injection', () => {
    let customService: IndexedDBStorageService;

    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          SILENT_LOGGER_PROVIDER,
          provideTranslateTesting(),
          { provide: RETRY_CONFIG, useValue: { baseMs: 50, maxMs: 500 } }
        ]
      });
      customService = TestBed.inject(IndexedDBStorageService);
    });

    afterEach(async () => {
      await customService.clear().catch(() => undefined);
    });

    it('should use custom RETRY_CONFIG values', () => {
      expect(customService).toBeTruthy();
    });

    it('should operate normally with custom retry config', async () => {
      const birthday: Birthday = { ...mockBirthday, id: 'retry-cfg-1' };
      await customService.addBirthday(birthday);
      const birthdays = await customService.getBirthdays();
      expect(birthdays.some(b => b.id === 'retry-cfg-1')).toBeTrue();
      await customService.deleteBirthday('retry-cfg-1');
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

  // -------------------------------------------------------------------------
  // _dataVersion stamping
  // -------------------------------------------------------------------------

  describe('_dataVersion stamping on writes', () => {
    let connection: IndexedDBConnectionService;

    beforeEach(() => {
      connection = TestBed.inject(IndexedDBConnectionService);
    });

    function getRaw(
      db: IDBDatabase,
      id: string
    ): Promise<Record<string, unknown> | undefined> {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(['birthdays'], 'readonly');
        const request = tx.objectStore('birthdays').get(id);
        request.onsuccess = () => resolve(request.result as Record<string, unknown> | undefined);
        request.onerror = () => reject(request.error);
      });
    }

    it('should stamp _dataVersion when adding a birthday', async () => {
      const birthday: Birthday = { ...mockBirthday, id: 'stamp-add' };
      await service.addBirthday(birthday);

      const db = await connection.getDB();
      const raw = await getRaw(db, 'stamp-add');
      expect(raw?.['_dataVersion']).toBe(CURRENT_DATA_VERSION);
    });

    it('should stamp _dataVersion when updating a birthday', async () => {
      const birthday: Birthday = { ...mockBirthday, id: 'stamp-update' };
      await service.addBirthday(birthday);
      await service.updateBirthday({ ...birthday, name: 'Updated' });

      const db = await connection.getDB();
      const raw = await getRaw(db, 'stamp-update');
      expect(raw?.['_dataVersion']).toBe(CURRENT_DATA_VERSION);
    });

    it('should stamp _dataVersion when saving birthdays batch', async () => {
      const birthday: Birthday = { ...mockBirthday, id: 'stamp-save' };
      await service.saveBirthdays([birthday]);

      const db = await connection.getDB();
      const raw = await getRaw(db, 'stamp-save');
      expect(raw?.['_dataVersion']).toBe(CURRENT_DATA_VERSION);
    });

    it('should strip _dataVersion from returned Birthday objects (Zod strips unknown keys)', async () => {
      const birthday: Birthday = { ...mockBirthday, id: 'strip-version' };
      await service.addBirthday(birthday);

      const birthdays = await service.getBirthdays();
      const found = birthdays.find(b => b.id === 'strip-version');
      expect(found).toBeDefined();
      expect((found as unknown as Record<string, unknown>)['_dataVersion']).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Migration fallback in getBirthdays
  // -------------------------------------------------------------------------

  describe('Migration fallback in getBirthdays', () => {
    let connection: IndexedDBConnectionService;
    let migrationService: IdbDataMigrationService;

    beforeEach(() => {
      connection = TestBed.inject(IndexedDBConnectionService);
      migrationService = TestBed.inject(IdbDataMigrationService);
    });

    function putRawBirthday(db: IDBDatabase, record: object): Promise<void> {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(['birthdays'], 'readwrite');
        tx.objectStore('birthdays').put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }

    function deleteRawBirthday(db: IDBDatabase, id: string): Promise<void> {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(['birthdays'], 'readwrite');
        tx.objectStore('birthdays').delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }

    it('should rescue a stale record that fails Zod but is fixed by migration', async () => {
      const db = await connection.getDB();
      // A record with an invalid birthDate will fail the Zod regex after toDateString
      // produces 'NaN-NaN-NaN'. The migration spy fixes it before re-validation.
      await putRawBirthday(db, {
        id: 'rescue-test',
        name: 'Legacy User',
        birthDate: 'invalid-date-string'
      });

      spyOn(migrationService, 'migrateRawBirthday').and.callFake((raw) => ({
        ...raw,
        birthDate: '1990-05-10',
        _dataVersion: CURRENT_DATA_VERSION
      }));

      const birthdays = await service.getBirthdays();
      const found = birthdays.find(b => b.id === 'rescue-test');
      expect(found).toBeDefined();
      expect(found!.name).toBe('Legacy User');
      expect(found!.birthDate).toBe('1990-05-10');

      await deleteRawBirthday(db, 'rescue-test').catch(() => undefined);
    });

    it('should skip a record when migration also cannot produce a valid result', async () => {
      const db = await connection.getDB();
      await putRawBirthday(db, {
        id: 'unfixable',
        name: 'Ghost',
        birthDate: 'invalid-date-string'
      });

      // Migration runs but birthDate remains invalid
      spyOn(migrationService, 'migrateRawBirthday').and.callFake((raw) => ({
        ...raw,
        _dataVersion: CURRENT_DATA_VERSION
        // birthDate is still 'invalid-date-string'
      }));

      const birthdays = await service.getBirthdays();
      expect(birthdays.find(b => b.id === 'unfixable')).toBeUndefined();

      await deleteRawBirthday(db, 'unfixable').catch(() => undefined);
    });

    it('should skip a record when migration throws', async () => {
      const db = await connection.getDB();
      await putRawBirthday(db, {
        id: 'migration-throws',
        name: 'Error User',
        birthDate: 'invalid-date-string'
      });

      spyOn(migrationService, 'migrateRawBirthday').and.throwError('migration error');

      const birthdays = await service.getBirthdays();
      expect(birthdays.find(b => b.id === 'migration-throws')).toBeUndefined();

      await deleteRawBirthday(db, 'migration-throws').catch(() => undefined);
    });
  });
});
