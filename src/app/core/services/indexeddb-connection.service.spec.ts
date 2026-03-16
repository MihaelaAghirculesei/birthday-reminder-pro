import { TestBed } from '@angular/core/testing';
import { IndexedDBConnectionService } from './indexeddb-connection.service';
import { SILENT_LOGGER_PROVIDER } from './logger.service';

describe('IndexedDBConnectionService', () => {
  let service: IndexedDBConnectionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SILENT_LOGGER_PROVIDER]
    });
    service = TestBed.inject(IndexedDBConnectionService);
  });

  afterEach(() => {
    service.close();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return an IDBDatabase instance', async () => {
    const db = await service.getDB();
    expect(db).toBeTruthy();
    expect(db.name).toBe('BirthdayReminderDB');
    expect(db.version).toBe(4);
  });

  it('should return the same instance on subsequent calls (singleton)', async () => {
    const db1 = await service.getDB();
    const db2 = await service.getDB();
    expect(db1).toBe(db2);
  });

  it('should create all expected object stores', async () => {
    const db = await service.getDB();
    expect(db.objectStoreNames.contains('birthdays')).toBe(true);
    expect(db.objectStoreNames.contains('scheduledMessages')).toBe(true);
    expect(db.objectStoreNames.contains('pendingChanges')).toBe(true);
    expect(db.objectStoreNames.contains('errorReports')).toBe(true);
  });

  it('should reopen if previous connection was closed', async () => {
    const db1 = await service.getDB();
    service.close();

    const db2 = await service.getDB();
    expect(db2).toBeTruthy();
    expect(db2).not.toBe(db1);
    expect(db2.name).toBe('BirthdayReminderDB');
  });

  it('should handle concurrent getDB() calls (deduplication)', async () => {
    const [db1, db2, db3] = await Promise.all([
      service.getDB(),
      service.getDB(),
      service.getDB()
    ]);

    expect(db1).toBe(db2);
    expect(db2).toBe(db3);
  });

  it('should close connection and clear instance', async () => {
    const db = await service.getDB();
    expect(db).toBeTruthy();

    service.close();

    // Next call should open a new connection
    const db2 = await service.getDB();
    expect(db2).toBeTruthy();
    expect(db2).not.toBe(db);
  });

  it('should handle close when no connection exists', () => {
    // Should not throw
    expect(() => service.close()).not.toThrow();
  });
});
