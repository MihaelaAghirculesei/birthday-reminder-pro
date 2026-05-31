import { inject,Injectable } from '@angular/core';

import { IndexedDBConnectionService } from './indexeddb-connection.service';
import { LoggerService } from './logger.service';

export const CURRENT_DATA_VERSION = 1;

type RawRecord = Record<string, unknown>;
type DataMigrationFn = (raw: RawRecord) => RawRecord;

/**
 * Data-level migrations for IDB records.
 *
 * Separate from IndexedDBConnectionService's schema migrations (which handle
 * store/index creation). These handle field-level changes within existing
 * stores: field renames, format normalizations, new required fields with
 * defaults.
 *
 * Key   = fromVersion (the _dataVersion the record is upgrading FROM).
 * Value = pure function returning the upgraded record.
 *
 * Rules:
 *   • Never edit an existing entry — only add new ones.
 *   • Always set _dataVersion = fromVersion + 1 in the returned record.
 *   • Keep CURRENT_DATA_VERSION in sync: must equal highest key + 1.
 */
const BIRTHDAY_DATA_MIGRATIONS: ReadonlyMap<number, DataMigrationFn> = new Map<
  number,
  DataMigrationFn
>([
  [
    0,
    // v0 → v1: backfill _dataVersion on records written before versioning.
    // No field changes — pure version stamp.
    (raw) => ({ ...raw, _dataVersion: 1 }),
  ],
  // -------------------------------------------------------------------------
  // HOW TO ADD A NEW DATA MIGRATION (example: v1 → v2)
  //
  //   1. Add an entry with key 1:
  //        [1, (raw) => ({ ...raw, renamedField: raw.oldField, _dataVersion: 2 })]
  //   2. Bump CURRENT_DATA_VERSION to 2.
  //   3. Write a unit test for the new migration.
  //   4. Never edit entries above.
  // -------------------------------------------------------------------------
]);

@Injectable({ providedIn: 'root' })
export class IdbDataMigrationService {
  private readonly logger = inject(LoggerService);
  private readonly connection = inject(IndexedDBConnectionService);

  /**
   * Returns the stored data version of a raw IDB record.
   * Records written before versioning was introduced return 0.
   */
  getRecordVersion(raw: RawRecord): number {
    return typeof raw['_dataVersion'] === 'number' ? raw['_dataVersion'] : 0;
  }

  /**
   * Applies all pending birthday data migrations to a raw record in sequence.
   * Returns the migrated record stamped with the new _dataVersion.
   * Throws if a required migration step is not defined (programming error).
   */
  migrateRawBirthday(raw: RawRecord): RawRecord {
    const fromVersion = this.getRecordVersion(raw);

    if (fromVersion >= CURRENT_DATA_VERSION) {
      return raw;
    }

    let current = { ...raw };
    for (let v = fromVersion; v < CURRENT_DATA_VERSION; v++) {
      const migrate = BIRTHDAY_DATA_MIGRATIONS.get(v);
      if (!migrate) {
        throw new Error(
          `[IdbDataMigration] No birthday migration defined for v${v} → v${v + 1}`
        );
      }
      current = migrate(current);
    }
    return current;
  }

  /**
   * Eagerly scans all birthday records in IDB and upgrades any with a stale
   * _dataVersion. Call once at startup to minimize the lazy-migration path in
   * IndexedDBStorageService.
   *
   * @returns counts of migrated and failed records
   */
  async runBirthdayMigrations(): Promise<{ migrated: number; failed: number }> {
    let migrated = 0;
    let failed = 0;

    try {
      const db = await this.connection.getDB();
      const allRaw = await this.getAllRaw(db, 'birthdays');
      const stale = allRaw.filter(
        (r) => this.getRecordVersion(r) < CURRENT_DATA_VERSION
      );

      if (stale.length === 0) {
        return { migrated: 0, failed: 0 };
      }

      this.logger.info(
        `[IdbDataMigration] Migrating ${stale.length} stale birthday record(s)...`
      );

      const upgraded: RawRecord[] = [];
      for (const raw of stale) {
        try {
          upgraded.push(this.migrateRawBirthday(raw));
          migrated++;
        } catch (err) {
          this.logger.error(
            '[IdbDataMigration] Failed to migrate record:',
            raw['id'],
            err
          );
          failed++;
        }
      }

      if (upgraded.length > 0) {
        await this.putRecords(db, 'birthdays', upgraded);
      }

      this.logger.info(
        `[IdbDataMigration] Done: ${migrated} migrated, ${failed} failed`
      );
    } catch (err) {
      this.logger.error('[IdbDataMigration] runBirthdayMigrations error:', err);
    }

    return { migrated, failed };
  }

  private getAllRaw(db: IDBDatabase, storeName: string): Promise<RawRecord[]> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], 'readonly');
      const request = tx.objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result as RawRecord[]);
      request.onerror = () => reject(request.error);
    });
  }

  private putRecords(
    db: IDBDatabase,
    storeName: string,
    records: RawRecord[]
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], 'readwrite');
      records.forEach((r) => tx.objectStore(storeName).put(r));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
