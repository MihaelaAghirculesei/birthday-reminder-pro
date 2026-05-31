import { isPlatformBrowser } from '@angular/common';
import { inject,Injectable, InjectionToken, PLATFORM_ID } from '@angular/core';

import { type Birthday, type ScheduledMessage } from '../../shared';
import { toDateString } from '../../shared/utils/date.utils';
import { CURRENT_DATA_VERSION,IdbDataMigrationService } from './idb-data-migration.service';
import { IndexedDBConnectionService } from './indexeddb-connection.service';
import { LoggerService } from './logger.service';

const RETRYABLE_ERRORS = ['QuotaExceededError', 'UnknownError', 'AbortError'];

export interface RetryConfig {
  baseMs: number;
  maxMs: number;
}

export const RETRY_CONFIG = new InjectionToken<RetryConfig>('RetryConfig', {
  providedIn: 'root',
  factory: () => ({ baseMs: 100, maxMs: 1_000 })
});

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
  private retryConfig = inject(RETRY_CONFIG);
  private dataMigration = inject(IdbDataMigrationService);
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

        const delay = Math.min(this.retryConfig.baseMs * Math.pow(2, attempt - 1), this.retryConfig.maxMs);
        this.logger.warn(`[IndexedDB] ${context} failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /** Stamps _dataVersion on a record before writing to IDB. */
  private withVersion<T extends object>(record: T): T & { _dataVersion: number } {
    return { ...record, _dataVersion: CURRENT_DATA_VERSION };
  }

  private tryMigrateBirthday(
    raw: Record<string, unknown>,
    sanitize: (d: Record<string, unknown>) => Record<string, unknown>,
    safeParse: (d: unknown) => { success: boolean; data?: Birthday; error?: { issues: unknown[] } }
  ): { birthday: Birthday; raw: Record<string, unknown> } | null {
    try {
      const migrated = this.dataMigration.migrateRawBirthday(raw);
      const sanitized = sanitize({
        ...migrated,
        birthDate: toDateString(migrated['birthDate'] as string)
      });
      const result = safeParse(sanitized);
      if (result.success) {
        return { birthday: result.data as Birthday, raw: migrated };
      }
      this.logger.warn(
        '[IndexedDB] Skipping invalid birthday (migration could not fix):',
        raw['id'],
        result.error?.issues
      );
      return null;
    } catch {
      return null;
    }
  }

  /** Persists migrated records back to IDB in a single write transaction. */
  private async persistMigratedBirthdays(
    records: Record<string, unknown>[]
  ): Promise<void> {
    const db = await this.connection.getDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction([this.storeName], 'readwrite');
      records.forEach((r) => tx.objectStore(this.storeName).put(r));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getBirthdays(): Promise<Birthday[]> {
    if (!isPlatformBrowser(this.platformId)) {
      return [];
    }

    try {
      const { sanitizeBirthdayData, safeParseBirthday } = await import('../../shared/schemas/birthday.schema');
      return await this.executeWithRetry(async () => {
        const db = await this.connection.getDB();
        return new Promise<Birthday[]>((resolve, reject) => {
          const transaction = db.transaction([this.storeName], 'readonly');
          const store = transaction.objectStore(this.storeName);
          const request = store.getAll();

          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const birthdays: Birthday[] = [];
            const toMigrate: Record<string, unknown>[] = [];

            for (const raw of request.result) {
              const sanitized = sanitizeBirthdayData({
                ...raw,
                birthDate: toDateString(raw.birthDate)
              });
              const result = safeParseBirthday(sanitized);
              if (result.success) {
                birthdays.push(result.data as Birthday);
              } else {
                const rescued = this.tryMigrateBirthday(
                  raw as Record<string, unknown>,
                  sanitizeBirthdayData,
                  safeParseBirthday
                );
                if (rescued) {
                  birthdays.push(rescued.birthday);
                  toMigrate.push(rescued.raw);
                } else {
                  this.logger.warn('[IndexedDB] Skipping invalid birthday record:', raw.id, result.error.issues);
                }
              }
            }

            if (toMigrate.length > 0) {
              this.persistMigratedBirthdays(toMigrate).catch((err) =>
                this.logger.warn('[IndexedDB] Failed to persist migrated birthdays:', err)
              );
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
          store.add(this.withVersion(birthday));
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
        let settled = false;
        const rejectOnce = (err: DOMException | null) => {
          if (settled) return;
          settled = true;
          reject(err ?? new Error('Transaction aborted'));
        };
        const transaction = db.transaction([this.storeName], 'readwrite');
        transaction.objectStore(this.storeName).add(this.withVersion(birthday));
        transaction.oncomplete = () => { settled = true; resolve(); };
        transaction.onerror = () => rejectOnce(transaction.error);
        transaction.onabort = () => rejectOnce(transaction.error);
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
          store.add(this.withVersion(birthday));
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
        let settled = false;
        const rejectOnce = (err: DOMException | null) => {
          if (settled) return;
          settled = true;
          reject(err ?? new Error('Transaction aborted'));
        };
        const transaction = db.transaction([this.storeName], 'readwrite');
        transaction.objectStore(this.storeName).put(this.withVersion(birthday));
        transaction.oncomplete = () => { settled = true; resolve(); };
        transaction.onerror = () => rejectOnce(transaction.error);
        transaction.onabort = () => rejectOnce(transaction.error);
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
        let settled = false;
        const rejectOnce = (err: DOMException | null) => {
          if (settled) return;
          settled = true;
          reject(err ?? new Error('Transaction aborted'));
        };
        const transaction = db.transaction([this.storeName], 'readwrite');
        transaction.objectStore(this.storeName).delete(id);
        transaction.oncomplete = () => { settled = true; resolve(); };
        transaction.onerror = () => rejectOnce(transaction.error);
        transaction.onabort = () => rejectOnce(transaction.error);
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
        transaction.objectStore(this.storeName).clear();
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
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
      const { safeParseScheduledMessage } = await import('../../shared/schemas/birthday.schema');
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
                messages.push(result.data as ScheduledMessage);
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
