import { Injectable, PLATFORM_ID, DestroyRef, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LoggerService } from './logger.service';

@Injectable({ providedIn: 'root' })
export class IndexedDBConnectionService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly logger = inject(LoggerService);

  private dbInstance: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;

  readonly dbName = 'BirthdayReminderDB';
  readonly dbVersion = 4;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.close());
  }

  async getDB(): Promise<IDBDatabase> {
    if (!isPlatformBrowser(this.platformId)) {
      throw new Error('IndexedDB is not available on the server');
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
        this.logger.error('[IndexedDB Connection] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        const db = request.result;

        db.onclose = () => {
          this.logger.warn('[IndexedDB Connection] Database connection closed unexpectedly');
          this.dbInstance = null;
          this.dbPromise = null;
        };

        db.onerror = (event) => {
          this.logger.error('[IndexedDB Connection] Database error:', event);
        };

        this.dbPromise = null;
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('birthdays')) {
          const store = db.createObjectStore('birthdays', { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('birthDate', 'birthDate', { unique: false });
        }

        if (!db.objectStoreNames.contains('scheduledMessages')) {
          const messageStore = db.createObjectStore('scheduledMessages', { keyPath: 'id' });
          messageStore.createIndex('birthdayId', 'birthdayId', { unique: false });
          messageStore.createIndex('active', 'active', { unique: false });
        }

        if (!db.objectStoreNames.contains('pendingChanges')) {
          const pendingStore = db.createObjectStore('pendingChanges', { keyPath: 'id' });
          pendingStore.createIndex('entityType', 'entityType', { unique: false });
          pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('errorReports')) {
          const errorStore = db.createObjectStore('errorReports', { keyPath: 'id', autoIncrement: true });
          errorStore.createIndex('type', 'type', { unique: false });
          errorStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }
}
