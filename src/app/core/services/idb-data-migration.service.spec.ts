import { TestBed } from '@angular/core/testing';

import { provideTranslateTesting } from '../../testing/translate-testing';
import { CURRENT_DATA_VERSION,IdbDataMigrationService } from './idb-data-migration.service';
import { IndexedDBConnectionService } from './indexeddb-connection.service';
import { SILENT_LOGGER_PROVIDER } from './logger.service';

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

    it('throws a descriptive error when no migration step is defined for a version', () => {
      // _dataVersion: -1 forces the loop to look up migration step -1,
      // which is intentionally absent — exercises the programming-error guard that
      // prevents silent data corruption when CURRENT_DATA_VERSION is bumped without
      // a corresponding entry in BIRTHDAY_DATA_MIGRATIONS.
      expect(() => service.migrateRawBirthday({ id: 'x', _dataVersion: -1 }))
        .toThrowError(/No birthday migration defined/);
    });
  });

  // -------------------------------------------------------------------------
  // Data migration steps — per-version pre/post contracts
  //
  // Each describe block below documents the exact input → output contract for
  // one migration step. When you add a new data migration (e.g. v1 → v2),
  // add a matching describe block here before committing.
  // -------------------------------------------------------------------------

  describe('data migration steps — per-version contracts', () => {
    describe('v0 → v1: backfill _dataVersion (pure version stamp)', () => {
      it('sets _dataVersion to 1 on a record that never had a version field', () => {
        const pre = { id: 'dm-a', name: 'Alice', birthDate: '1990-01-01', notes: 'keep this' };
        const post = service.migrateRawBirthday(pre);
        expect(post['_dataVersion']).toBe(1);
      });

      it('does not add or remove any other fields (pure stamp)', () => {
        const pre = { id: 'dm-b', name: 'Alice', birthDate: '1990-01-01', notes: 'keep this' };
        const post = service.migrateRawBirthday(pre);
        const expectedKeys = [...Object.keys(pre), '_dataVersion'].sort();
        expect(Object.keys(post).sort()).toEqual(expectedKeys);
      });

      it('preserves all field values exactly', () => {
        const pre = { id: 'dm-c', name: 'Bob', birthDate: '1985-06-15', notes: 'important', category: 'family' };
        const post = service.migrateRawBirthday(pre);
        expect(post['id']).toBe('dm-c');
        expect(post['name']).toBe('Bob');
        expect(post['birthDate']).toBe('1985-06-15');
        expect(post['notes']).toBe('important');
        expect(post['category']).toBe('family');
      });

      it('treats an explicit _dataVersion: 0 identically to a missing version field', () => {
        const withZero  = service.migrateRawBirthday({ id: 'dm-d', name: 'Carol', _dataVersion: 0 });
        const withAbsent = service.migrateRawBirthday({ id: 'dm-d', name: 'Carol' });
        expect(withZero['_dataVersion']).toBe(withAbsent['_dataVersion']);
        expect(withZero['name']).toBe(withAbsent['name']);
      });
    });

    // -----------------------------------------------------------------------
    // Completeness guard
    //
    // This test fails immediately if CURRENT_DATA_VERSION is bumped without a
    // corresponding entry in BIRTHDAY_DATA_MIGRATIONS, surfacing the omission
    // before any real data is touched.
    // -----------------------------------------------------------------------

    it('BIRTHDAY_DATA_MIGRATIONS has an entry for every step 0..CURRENT_DATA_VERSION-1', () => {
      for (let v = 0; v < CURRENT_DATA_VERSION; v++) {
        const raw = { id: `completeness-v${v}`, _dataVersion: v };
        expect(() => service.migrateRawBirthday(raw))
          .withContext(`migration step v${v} → v${v + 1} must be defined in BIRTHDAY_DATA_MIGRATIONS`)
          .not.toThrow();
      }
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
