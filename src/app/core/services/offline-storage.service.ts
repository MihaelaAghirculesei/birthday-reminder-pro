import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Birthday, ScheduledMessage } from '../../shared';
import { toDateString } from '../../shared/utils/date.utils';
import { sanitizeBirthdayData, safeParseBirthday, safeParseScheduledMessage } from '../../shared/schemas/birthday.schema';
import { LoggerService } from './logger.service';
import { IndexedDBConnectionService } from './indexeddb-connection.service';

const RETRYABLE_ERRORS = ['QuotaExceededError', 'UnknownError', 'AbortError'];
const BACKOFF_BASE_MS  = 100;
const BACKOFF_MAX_MS   = 1_000;

export interface OfflineStorageService {
  getBirthdays(): Promise<Birthday[]>;
  saveBirthdays(birthdays: Birthday[]): Promise<void>;
  addBirthday(birthday: Birthday): Promise<void>;
  addBirthdays(birthdays: Birthday[]): Promise<void>;
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
  private connection = inject(IndexedDBConnectionService);
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

        const delay = Math.min(BACKOFF_BASE_MS * Math.pow(2, attempt - 1), BACKOFF_MAX_MS);
        this.logger.warn(`[IndexedDB] ${context} failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  async getBirthdays(): Promise<Birthday[]> {
    if (!isPlatformBrowser(this.platformId)) {
      return [];
    }

    try {
      return await this.executeWithRetry(async () => {
        const db = await this.connection.getDB();
        return new Promise<Birthday[]>((resolve, reject) => {
          const transaction = db.transaction([this.storeName], 'readonly');
          const store = transaction.objectStore(this.storeName);
          const request = store.getAll();

          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const birthdays: Birthday[] = [];
            for (const raw of request.result) {
              const sanitized = sanitizeBirthdayData({
                ...raw,
                birthDate: toDateString(raw.birthDate)
              });
              const result = safeParseBirthday(sanitized);
              if (result.success) {
                birthdays.push(result.data);
              } else {
                this.logger.warn('[IndexedDB] Skipping invalid birthday record:', raw.id, result.error.issues);
              }
            }
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
      const db = await this.connection.getDB();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);

        store.clear();

        birthdays.forEach(birthday => {
          store.add(birthday);
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
      const db = await this.connection.getDB();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.add(birthday);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    }, 'addBirthday');
  }

  async addBirthdays(birthdays: Birthday[]): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    return this.executeWithRetry(async () => {
      const db = await this.connection.getDB();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);

        birthdays.forEach(birthday => {
          store.add(birthday);
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    }, 'addBirthdays');
  }

  async updateBirthday(birthday: Birthday): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    return this.executeWithRetry(async () => {
      const db = await this.connection.getDB();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(birthday);

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
      const db = await this.connection.getDB();
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
      const db = await this.connection.getDB();
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
      const db = await this.connection.getDB();
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
      const db = await this.connection.getDB();
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
      const db = await this.connection.getDB();
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
        const db = await this.connection.getDB();
        return new Promise<ScheduledMessage[]>((resolve, reject) => {
          const transaction = db.transaction([this.messagesStoreName], 'readonly');
          const store = transaction.objectStore(this.messagesStoreName);
          const index = store.index('birthdayId');
          const request = index.getAll(birthdayId);

          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const messages: ScheduledMessage[] = [];
            for (const raw of (request.result || [])) {
              const result = safeParseScheduledMessage(raw);
              if (result.success) {
                messages.push(result.data);
              } else {
                this.logger.warn('[IndexedDB] Skipping invalid scheduled message:', raw.id, result.error.issues);
              }
            }
            resolve(messages);
          };
        });
      }, 'getScheduledMessagesByBirthday');
    } catch (error) {
      this.logger.error('Failed to get scheduled messages from IndexedDB:', error);
      return [];
    }
  }
}