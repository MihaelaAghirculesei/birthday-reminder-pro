import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, inject,Injectable, PLATFORM_ID } from '@angular/core';

import { IdbMigrationError, IdbUnavailableError } from '../errors/app-errors';
import { LoggerService } from './logger.service';

// ---------------------------------------------------------------------------
// Migration types
// ---------------------------------------------------------------------------

interface MigrationContext {
  db: IDBDatabase;
  transaction: IDBTransaction;
}

type MigrationFn = (ctx: MigrationContext) => void;

// ---------------------------------------------------------------------------
// Migration map
//
// Key   = oldVersion (the version the user is upgrading FROM).
// Value = function that applies the schema changes to reach oldVersion + 1.
//
// Rules:
//   • Never edit an existing entry — only add new ones.
//   • Each function is responsible solely for its own delta.
//   • Keep dbVersion in sync: it must always equal the highest key + 1.
// ---------------------------------------------------------------------------

const DB_MIGRATIONS: ReadonlyMap<number, MigrationFn> = new Map<number, MigrationFn>([
  [
    0,
    // fresh install or upgrade from v0 → v1: create the birthdays store
    ({ db }) => {
      const store = db.createObjectStore('birthdays', { keyPath: 'id' });
      store.createIndex('name', 'name', { unique: false });
      store.createIndex('birthDate', 'birthDate', { unique: false });
    },
  ],
  [
    1,
    // v1 → v2: add scheduledMessages store
    ({ db }) => {
      const store = db.createObjectStore('scheduledMessages', { keyPath: 'id' });
      store.createIndex('birthdayId', 'birthdayId', { unique: false });
      store.createIndex('active', 'active', { unique: false });
    },
  ],
  [
    2,
    // v2 → v3: add pendingChanges store
    ({ db }) => {
      const store = db.createObjectStore('pendingChanges', { keyPath: 'id' });
      store.createIndex('entityType', 'entityType', { unique: false });
      store.createIndex('timestamp', 'timestamp', { unique: false });
    },
  ],
  [
    3,
    // v3 → v4: add errorReports store
    ({ db }) => {
      const store = db.createObjectStore('errorReports', {
        keyPath: 'id',
        autoIncrement: true,
      });
      store.createIndex('type', 'type', { unique: false });
      store.createIndex('timestamp', 'timestamp', { unique: false });
    },
  ],
  // -------------------------------------------------------------------------
  // HOW TO ADD A NEW MIGRATION (example: v4 → v5)
  //
  //   1. Add an entry with key 4:
  //        [4, ({ db, transaction }) => { /* your schema delta here */ }]
  //   2. Bump dbVersion below from 4 to 5.
  //   3. Write a unit test that verifies the new schema is present.
  //   4. Never touch the entries above — they are the historical record.
  // -------------------------------------------------------------------------
]);

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable({ providedIn: 'root' })
export class IndexedDBConnectionService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly logger = inject(LoggerService);

  private dbInstance: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;

  readonly dbName = 'BirthdayReminderDB';
  // Must always equal: highest key in DB_MIGRATIONS + 1
  readonly dbVersion = 4;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.close());
  }

  async getDB(): Promise<IDBDatabase> {
    if (!isPlatformBrowser(this.platformId)) {
      throw new IdbUnavailableError();
    }

    if (this.dbInstance) {
      return this.dbInstance;
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = this.openDB();
    try {
      this.dbInstance = await this.dbPromise;
      return this.dbInstance;
    } catch (error) {
      this.dbPromise = null;
      throw error;
    }
  }

  close(): void {
    if (this.dbInstance) {
      this.dbInstance.close();
      this.dbInstance = null;
      this.dbPromise = null;
    }
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        this.logger.error('[IndexedDB] Failed to open database:', request.error);
        reject(request.error);
      };

      // Fires when another tab holds an older version open and blocks the upgrade.
      // We log a clear message so users know they need to close other tabs.
      request.onblocked = () => {
        this.logger.warn(
          '[IndexedDB] Upgrade blocked — another tab has an older version open. ' +
            'Close all other tabs running this app and reload.',
        );
      };

      request.onsuccess = () => {
        const db = request.result;

        db.onclose = () => {
          this.logger.warn('[IndexedDB] Database connection closed unexpectedly');
          this.dbInstance = null;
          this.dbPromise = null;
        };

        db.onerror = (event) => {
          this.logger.error('[IndexedDB] Database error:', event);
        };

        // Fired when a newer version of the DB is opened elsewhere (e.g. another
        // tab was updated). Closing here allows that tab to complete its upgrade.
        db.onversionchange = () => {
          this.logger.warn(
            '[IndexedDB] A newer version of the database was detected. ' +
              'Closing this connection to allow the upgrade to proceed.',
          );
          this.close();
        };

        this.dbPromise = null;
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = (event.target as IDBOpenDBRequest).transaction!;
        const oldVersion = event.oldVersion;
        const newVersion = event.newVersion ?? this.dbVersion;

        this.logger.info(`[IndexedDB] Upgrading schema v${oldVersion} → v${newVersion}`);

        for (let fromVersion = oldVersion; fromVersion < newVersion; fromVersion++) {
          const migrate = DB_MIGRATIONS.get(fromVersion);

          if (!migrate) {
            // A gap means a migration was accidentally skipped. This is a
            // programming error — abort so it surfaces immediately in dev/QA.
            const msg = `[IndexedDB] No migration defined for v${fromVersion} → v${fromVersion + 1}`;
            this.logger.error(msg);
            transaction.abort();
            reject(new IdbMigrationError(msg));
            return;
          }

          try {
            migrate({ db, transaction });
            this.logger.info(`[IndexedDB] Migration v${fromVersion} → v${fromVersion + 1} applied`);
          } catch (err) {
            this.logger.error(
              `[IndexedDB] Migration v${fromVersion} → v${fromVersion + 1} failed — rolling back:`,
              err,
            );
            transaction.abort();
            reject(err);
            return;
          }
        }
      };
    });
  }
}
