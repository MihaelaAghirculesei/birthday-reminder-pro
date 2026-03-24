import { TestBed } from '@angular/core/testing';
import { IndexedDBConnectionService } from './indexeddb-connection.service';
import { SILENT_LOGGER_PROVIDER } from './logger.service';
import { provideTranslateTesting } from '../../testing/translate-testing';

describe('IndexedDBConnectionService', () => {
  let service: IndexedDBConnectionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SILENT_LOGGER_PROVIDER, provideTranslateTesting()]
    });
    service = TestBed.inject(IndexedDBConnectionService);
  });

  afterEach(() => {
    service.close();
  });

  // -------------------------------------------------------------------------
  // Basic connectivity
  // -------------------------------------------------------------------------

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return an IDBDatabase instance with the correct name and version', async () => {
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

  it('should deduplicate concurrent getDB() calls', async () => {
    const [db1, db2, db3] = await Promise.all([
      service.getDB(),
      service.getDB(),
      service.getDB()
    ]);
    expect(db1).toBe(db2);
    expect(db2).toBe(db3);
  });

  it('should reopen after an explicit close()', async () => {
    const db1 = await service.getDB();
    service.close();
    const db2 = await service.getDB();
    expect(db2).toBeTruthy();
    expect(db2).not.toBe(db1);
    expect(db2.name).toBe('BirthdayReminderDB');
  });

  it('should close connection and clear instance', async () => {
    const db = await service.getDB();
    expect(db).toBeTruthy();
    service.close();
    const db2 = await service.getDB();
    expect(db2).not.toBe(db);
  });

  it('should handle close() when no connection exists', () => {
    expect(() => service.close()).not.toThrow();
  });

  // -------------------------------------------------------------------------
  // Schema: object stores
  // -------------------------------------------------------------------------

  it('should create all expected object stores', async () => {
    const db = await service.getDB();
    expect(db.objectStoreNames.contains('birthdays')).toBe(true);
    expect(db.objectStoreNames.contains('scheduledMessages')).toBe(true);
    expect(db.objectStoreNames.contains('pendingChanges')).toBe(true);
    expect(db.objectStoreNames.contains('errorReports')).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Schema: indexes — validates that every migration ran in full
  // -------------------------------------------------------------------------

  it('birthdays store should have name and birthDate indexes (migration v0→v1)', async () => {
    const db = await service.getDB();
    const tx = db.transaction('birthdays', 'readonly');
    const store = tx.objectStore('birthdays');
    expect(store.indexNames.contains('name')).toBe(true);
    expect(store.indexNames.contains('birthDate')).toBe(true);
    tx.abort();
  });

  it('scheduledMessages store should have birthdayId and active indexes (migration v1→v2)', async () => {
    const db = await service.getDB();
    const tx = db.transaction('scheduledMessages', 'readonly');
    const store = tx.objectStore('scheduledMessages');
    expect(store.indexNames.contains('birthdayId')).toBe(true);
    expect(store.indexNames.contains('active')).toBe(true);
    tx.abort();
  });

  it('pendingChanges store should have entityType and timestamp indexes (migration v2→v3)', async () => {
    const db = await service.getDB();
    const tx = db.transaction('pendingChanges', 'readonly');
    const store = tx.objectStore('pendingChanges');
    expect(store.indexNames.contains('entityType')).toBe(true);
    expect(store.indexNames.contains('timestamp')).toBe(true);
    tx.abort();
  });

  it('errorReports store should have type and timestamp indexes (migration v3→v4)', async () => {
    const db = await service.getDB();
    const tx = db.transaction('errorReports', 'readonly');
    const store = tx.objectStore('errorReports');
    expect(store.indexNames.contains('type')).toBe(true);
    expect(store.indexNames.contains('timestamp')).toBe(true);
    tx.abort();
  });

  // -------------------------------------------------------------------------
  // Migration coverage guard
  //
  // Keeps dbVersion in sync with the number of migrations.
  // When you add a new migration, bump the expected value below.
  // The full integration is verified by the schema tests above: a missing
  // migration would leave a store or index absent, and those tests would fail.
  // -------------------------------------------------------------------------

  it('dbVersion should reflect the total number of migrations (currently 4)', () => {
    // Convention: dbVersion === highest key in DB_MIGRATIONS + 1.
    // Update this number whenever you add a new migration entry.
    expect(service.dbVersion).toBe(4);
  });
});
