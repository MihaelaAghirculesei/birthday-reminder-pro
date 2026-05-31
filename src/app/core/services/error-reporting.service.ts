import { isPlatformBrowser } from '@angular/common';
import { inject,Injectable, InjectionToken, PLATFORM_ID } from '@angular/core';

import { IndexedDBConnectionService } from './indexeddb-connection.service';
import { LoggerService } from './logger.service';

export interface ErrorReport {
  error: unknown;
  type: string;
  technicalMessage: string;
  timestamp: number;
  url?: string;
  userAgent?: string;
}

export interface SerializedErrorReport {
  id?: number;
  type: string;
  technicalMessage: string;
  timestamp: number;
  url?: string;
  userAgent?: string;
  serializedError: { message: string; name: string; stack?: string } | string;
}

export interface ErrorReporter {
  captureError(report: ErrorReport): void;
}

export const ERROR_REPORTER = new InjectionToken<ErrorReporter>('ERROR_REPORTER');

const STORE_NAME = 'errorReports';
const MAX_STORED_ERRORS = 200;
const PRUNE_EVERY_N = 20;

@Injectable({
  providedIn: 'root'
})
export class ErrorReportingService implements ErrorReporter {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly dbConnection = inject(IndexedDBConnectionService);
  private readonly logger = inject(LoggerService);

  private readonly isBrowser: boolean;
  private captureCount = 0;

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  captureError(report: ErrorReport): void {
    try {
      const serialized = this.serializeReport(report);
      if (this.isBrowser) {
        this.persistToIndexedDB(serialized);
        this.captureCount++;
        if (this.captureCount % PRUNE_EVERY_N === 0) {
          this.pruneOldErrors();
        }
      }
    } catch {
      // Error reporting must never throw
    }
  }

  async getRecentErrors(): Promise<SerializedErrorReport[]> {
    try {
      if (!this.isBrowser) {
        return [];
      }
      const db = await this.dbConnection.getDB();
      return new Promise<SerializedErrorReport[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result ?? []);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return [];
    }
  }

  async clearErrors(): Promise<void> {
    try {
      if (!this.isBrowser) {
        return;
      }
      const db = await this.dbConnection.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch {
      // Error reporting must never throw
    }
  }

  private serializeReport(report: ErrorReport): SerializedErrorReport {
    let serializedError: SerializedErrorReport['serializedError'];
    if (report.error instanceof Error) {
      serializedError = {
        message: report.error.message,
        name: report.error.name,
        stack: report.error.stack
      };
    } else if (typeof report.error === 'string') {
      serializedError = report.error;
    } else {
      try {
        serializedError = JSON.stringify(report.error) ?? 'Unknown error';
      } catch {
        serializedError = 'Unserializable error';
      }
    }

    return {
      type: report.type,
      technicalMessage: report.technicalMessage,
      timestamp: report.timestamp,
      url: report.url,
      userAgent: report.userAgent,
      serializedError
    };
  }

  private async persistToIndexedDB(report: SerializedErrorReport): Promise<void> {
    try {
      const db = await this.dbConnection.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.add(report);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch {
      this.logger.warn('[ErrorReporting] Failed to persist error to IndexedDB');
    }
  }

  private async pruneOldErrors(): Promise<void> {
    try {
      const db = await this.dbConnection.getDB();
      const count = await new Promise<number>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (count <= MAX_STORED_ERRORS) {
        return;
      }

      const deleteCount = count - MAX_STORED_ERRORS;
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('timestamp');
        const request = index.openCursor();
        let deleted = 0;

        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor && deleted < deleteCount) {
            cursor.delete();
            deleted++;
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch {
      // Pruning failure is non-critical
    }
  }
}
