import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Birthday, ScheduledMessage } from '../../shared';
import { LoggerService } from './logger.service';

interface StoredBirthday extends Omit<Birthday, 'birthDate'> {
  birthDate: string;
}

const RETRYABLE_ERRORS = ['QuotaExceededError', 'UnknownError', 'AbortError'];

export interface OfflineStorageService {
  getBirthdays(): Promise<Birthday[]>;
  saveBirthdays(birthdays: Birthday[]): Promise<void>;
  addBirthday(birthday: Birthday): Promise<void>;
  updateBirthday(birthday: Birthday): Promise<void>;
  deleteBirthday(id: string): Promise<void>;
  clear(): Promise<void>;
}

@Injectable({
  providedIn: 'root'
})
export class IndexedDBStorageService implements OfflineStorageService {
  private platformId = inject(PLATFORM_ID);
  private logger = inject(LoggerService);
  private dbName = 'BirthdayReminderDB';
  private dbVersion = 3;
  private storeName = 'birthdays';
  private messagesStoreName = 'scheduledMessages';

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string,
    maxRetries = 3
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        const errorName = (error as DOMException)?.name || 'Unknown';

        if (!RETRYABLE_ERRORS.includes(errorName) || attempt === maxRetries) {
          this.logger.error(`[IndexedDB] ${context} failed after ${attempt} attempt(s):`, error);
          throw error;
        }

        const delay = Math.min(100 * Math.pow(2, attempt - 1), 1000);
        this.logger.warn(`[IndexedDB] ${context} failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  private async openDB(): Promise<IDBDatabase> {
    if (!isPlatformBrowser(this.platformId)) {
      throw new Error('IndexedDB is not available on the server');
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('birthDate', 'birthDate', { unique: false });
        }

        if (!db.objectStoreNames.contains(this.messagesStoreName)) {
          const messageStore = db.createObjectStore(this.messagesStoreName, { keyPath: 'id' });
          messageStore.createIndex('birthdayId', 'birthdayId', { unique: false });
          messageStore.createIndex('active', 'active', { unique: false });
        }

        if (!db.objectStoreNames.contains('pendingChanges')) {
          const pendingStore = db.createObjectStore('pendingChanges', { keyPath: 'id' });
          pendingStore.createIndex('entityType', 'entityType', { unique: false });
          pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async getBirthdays(): Promise<Birthday[]> {
    if (!isPlatformBrowser(this.platformId)) {
      return [];
    }

    try {
      return await this.executeWithRetry(async () => {
        const db = await this.openDB();
        return new Promise<Birthday[]>((resolve, reject) => {
          const transaction = db.transaction([this.storeName], 'readonly');
          const store = transaction.objectStore(this.storeName);
          const request = store.getAll();

          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const birthdays = request.result.map((b: StoredBirthday) => ({
              ...b,
              birthDate: new Date(b.birthDate)
            }));
            resolve(birthdays);
          };
        });
      }, 'getBirthdays');
    } catch (error) {
      this.logger.error('Failed to get birthdays from IndexedDB:', error);
      return [];
    }
  }

  async saveBirthdays(birthdays: Birthday[]): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    return this.executeWithRetry(async () => {
      const db = await this.openDB();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);

        store.clear();

        birthdays.forEach(birthday => {
          store.add({
            ...birthday,
            birthDate: birthday.birthDate.toISOString()
          });
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    }, 'saveBirthdays');
  }

  async addBirthday(birthday: Birthday): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    return this.executeWithRetry(async () => {
      const db = await this.openDB();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.add({
          ...birthday,
          birthDate: birthday.birthDate.toISOString()
        });

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    }, 'addBirthday');
  }

  async updateBirthday(birthday: Birthday): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    return this.executeWithRetry(async () => {
      const db = await this.openDB();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put({
          ...birthday,
          birthDate: birthday.birthDate.toISOString()
        });

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    }, 'updateBirthday');
  }

  async deleteBirthday(id: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    return this.executeWithRetry(async () => {
      const db = await this.openDB();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(id);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    }, 'deleteBirthday');
  }

  async clear(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    return this.executeWithRetry(async () => {
      const db = await this.openDB();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    }, 'clear');
  }

  async saveScheduledMessage(message: ScheduledMessage): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    return this.executeWithRetry(async () => {
      const db = await this.openDB();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([this.messagesStoreName], 'readwrite');
        const store = transaction.objectStore(this.messagesStoreName);
        const request = store.add(message);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    }, 'saveScheduledMessage');
  }

  async updateScheduledMessage(message: ScheduledMessage): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    return this.executeWithRetry(async () => {
      const db = await this.openDB();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([this.messagesStoreName], 'readwrite');
        const store = transaction.objectStore(this.messagesStoreName);
        const request = store.put(message);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    }, 'updateScheduledMessage');
  }

  async deleteScheduledMessage(id: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    return this.executeWithRetry(async () => {
      const db = await this.openDB();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([this.messagesStoreName], 'readwrite');
        const store = transaction.objectStore(this.messagesStoreName);
        const request = store.delete(id);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    }, 'deleteScheduledMessage');
  }

  async getScheduledMessagesByBirthday(birthdayId: string): Promise<ScheduledMessage[]> {
    if (!isPlatformBrowser(this.platformId)) {
      return [];
    }

    try {
      return await this.executeWithRetry(async () => {
        const db = await this.openDB();
        return new Promise<ScheduledMessage[]>((resolve, reject) => {
          const transaction = db.transaction([this.messagesStoreName], 'readonly');
          const store = transaction.objectStore(this.messagesStoreName);
          const index = store.index('birthdayId');
          const request = index.getAll(birthdayId);

          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve(request.result || []);
        });
      }, 'getScheduledMessagesByBirthday');
    } catch (error) {
      this.logger.error('Failed to get scheduled messages from IndexedDB:', error);
      return [];
    }
  }
}