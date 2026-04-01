import { TestBed } from '@angular/core/testing';
import { IdbDataMigrationService, CURRENT_DATA_VERSION } from './idb-data-migration.service';
import { IndexedDBConnectionService } from './indexeddb-connection.service';
import { SILENT_LOGGER_PROVIDER } from './logger.service';
import { provideTranslateTesting } from '../../testing/translate-testing';

// ---------------------------------------------------------------------------
// IDB helpers
// ---------------------------------------------------------------------------

function putRaw(db: IDBDatabase, storeName: string, record: object): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], 'readwrite');
    tx.objectStore(storeName).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function getRaw(
  db: IDBDatabase,
  storeName: string,
  id: string
): Promise<Record<string, unknown> | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], 'readonly');
    const request = tx.objectStore(storeName).get(id);
    request.onsuccess = () => resolve(request.result as Record<string, unknown> | undefined);
    request.onerror = () => reject(request.error);
  });
}

function clearStore(db: IDBDatabase, storeName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], 'readwrite');
    tx.objectStore(storeName).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('IdbDataMigrationService', () => {
  let service: IdbDataMigrationService;
  let connection: IndexedDBConnectionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SILENT_LOGGER_PROVIDER, provideTranslateTesting()]
    });
    service = TestBed.inject(IdbDataMigrationService);
    connection = TestBed.inject(IndexedDBConnectionService);
  });

  afterEach(async () => {
    try {
      const db = await connection.getDB();
      await clearStore(db, 'birthdays');
    } catch {
      // ignore cleanup errors
    }
    connection.close();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // getRecordVersion
  // -------------------------------------------------------------------------

  describe('getRecordVersion', () => {
    it('returns 0 when _dataVersion is absent', () => {
      expect(service.getRecordVersion({ id: '1', name: 'Alice' })).toBe(0);
    });

    it('returns 0 when _dataVersion is a string (not a number)', () => {
      expect(service.getRecordVersion({ id: '1', _dataVersion: 'one' })).toBe(0);
    });

    it('returns 0 when _dataVersion is null', () => {
      expect(service.getRecordVersion({ id: '1', _dataVersion: null })).toBe(0);
    });

    it('returns the numeric _dataVersion when present', () => {
      expect(service.getRecordVersion({ id: '1', _dataVersion: 3 })).toBe(3);
    });

    it('returns CURRENT_DATA_VERSION for a freshly written record', () => {
      expect(
        service.getRecordVersion({ id: '1', _dataVersion: CURRENT_DATA_VERSION })
      ).toBe(CURRENT_DATA_VERSION);
    });
  });

  // -------------------------------------------------------------------------
  // migrateRawBirthday
  // -------------------------------------------------------------------------

  describe('migrateRawBirthday', () => {
    it('returns the record unchanged when already at CURRENT_DATA_VERSION', () => {
      const raw = { id: '1', name: 'Alice', _dataVersion: CURRENT_DATA_VERSION };
      const result = service.migrateRawBirthday(raw);
      expect(result).toEqual(raw);
    });

    it('returns the record unchanged when _dataVersion is higher than current', () => {
      const raw = { id: '1', _dataVersion: CURRENT_DATA_VERSION + 5 };
      const result = service.migrateRawBirthday(raw);
      expect(result).toEqual(raw);
    });

    it('stamps _dataVersion on a record that has no version field (v0 → current)', () => {
      const raw = { id: '1', name: 'Bob', birthDate: '1990-01-01' };
      const result = service.migrateRawBirthday(raw);
      expect(result['_dataVersion']).toBe(CURRENT_DATA_VERSION);
    });

    it('preserves all existing fields during migration', () => {
      const raw = { id: '2', name: 'Carol', birthDate: '2000-06-15', notes: 'keep me' };
      const result = service.migrateRawBirthday(raw);
      expect(result['id']).toBe('2');
      expect(result['name']).toBe('Carol');
      expect(result['birthDate']).toBe('2000-06-15');
      expect(result['notes']).toBe('keep me');
    });

    it('does not mutate the original record', () => {
      const raw = { id: '3', name: 'Dan' };
      service.migrateRawBirthday(raw);
      expect((raw as Record<string, unknown>)['_dataVersion']).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // runBirthdayMigrations
  // -------------------------------------------------------------------------

  describe('runBirthdayMigrations', () => {
    it('returns { migrated: 0, failed: 0 } when the store is empty', async () => {
      const result = await service.runBirthdayMigrations();
      expect(result).toEqual({ migrated: 0, failed: 0 });
    });

    it('returns { migrated: 0, failed: 0 } when all records are already current', async () => {
      const db = await connection.getDB();
      await putRaw(db, 'birthdays', {
        id: 'already-current',
        name: 'Eve',
        _dataVersion: CURRENT_DATA_VERSION
      });

      const result = await service.runBirthdayMigrations();
      expect(result).toEqual({ migrated: 0, failed: 0 });
    });

    it('migrates stale records and writes the upgraded versions back to IDB', async () => {
      const db = await connection.getDB();
      await putRaw(db, 'birthdays', { id: 'stale-1', name: 'Frank' });
      await putRaw(db, 'birthdays', { id: 'stale-2', name: 'Grace' });

      const result = await service.runBirthdayMigrations();

      expect(result.migrated).toBe(2);
      expect(result.failed).toBe(0);

      const updated1 = await getRaw(db, 'birthdays', 'stale-1');
      const updated2 = await getRaw(db, 'birthdays', 'stale-2');
      expect(updated1?.['_dataVersion']).toBe(CURRENT_DATA_VERSION);
      expect(updated2?.['_dataVersion']).toBe(CURRENT_DATA_VERSION);
    });

    it('preserves existing data fields when migrating', async () => {
      const db = await connection.getDB();
      await putRaw(db, 'birthdays', {
        id: 'preserve-test',
        name: 'Hank',
        birthDate: '1985-03-20',
        notes: 'important note'
      });

      await service.runBirthdayMigrations();

      const updated = await getRaw(db, 'birthdays', 'preserve-test');
      expect(updated?.['name']).toBe('Hank');
      expect(updated?.['birthDate']).toBe('1985-03-20');
      expect(updated?.['notes']).toBe('important note');
    });

    it('counts failed migrations and continues processing remaining records', async () => {
      const db = await connection.getDB();
      await putRaw(db, 'birthdays', { id: 'good-record', name: 'Iris' });
      await putRaw(db, 'birthdays', { id: 'bad-record', name: 'Jake' });

      spyOn(service, 'migrateRawBirthday').and.callFake((raw) => {
        if (raw['id'] === 'bad-record') {
          throw new Error('Simulated migration failure');
        }
        return { ...raw, _dataVersion: CURRENT_DATA_VERSION };
      });

      const result = await service.runBirthdayMigrations();

      expect(result.migrated).toBe(1);
      expect(result.failed).toBe(1);
    });

    it('handles DB errors gracefully and returns zero counts', async () => {
      spyOn(connection, 'getDB').and.rejectWith(new Error('DB unavailable'));

      const result = await service.runBirthdayMigrations();

      expect(result).toEqual({ migrated: 0, failed: 0 });
    });

    it('migrates a mix of stale and current records correctly', async () => {
      const db = await connection.getDB();
      await putRaw(db, 'birthdays', { id: 'current', _dataVersion: CURRENT_DATA_VERSION });
      await putRaw(db, 'birthdays', { id: 'stale', name: 'Kate' });

      const result = await service.runBirthdayMigrations();

      expect(result.migrated).toBe(1);
      expect(result.failed).toBe(0);

      const currentRaw = await getRaw(db, 'birthdays', 'current');
      const staleRaw = await getRaw(db, 'birthdays', 'stale');
      expect(currentRaw?.['_dataVersion']).toBe(CURRENT_DATA_VERSION);
      expect(staleRaw?.['_dataVersion']).toBe(CURRENT_DATA_VERSION);
    });
  });

  // -------------------------------------------------------------------------
  // CURRENT_DATA_VERSION guard
  // -------------------------------------------------------------------------

  it('CURRENT_DATA_VERSION should be a positive integer', () => {
    expect(Number.isInteger(CURRENT_DATA_VERSION)).toBeTrue();
    expect(CURRENT_DATA_VERSION).toBeGreaterThan(0);
  });
});
