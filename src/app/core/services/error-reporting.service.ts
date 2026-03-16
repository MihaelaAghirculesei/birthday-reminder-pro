import { Injectable, InjectionToken, PLATFORM_ID, DestroyRef, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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
export const ERROR_REPORTING_ENDPOINT = new InjectionToken<string>('ERROR_REPORTING_ENDPOINT');

const STORE_NAME = 'errorReports';
const MAX_STORED_ERRORS = 200;
const FLUSH_INTERVAL_MS = 30_000;
const PRUNE_EVERY_N = 20;

@Injectable({
  providedIn: 'root'
})
export class ErrorReportingService implements ErrorReporter {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly dbConnection = inject(IndexedDBConnectionService);
  private readonly logger = inject(LoggerService);
  private readonly endpoint: string | null = inject(ERROR_REPORTING_ENDPOINT, { optional: true }) ?? null;

  private readonly isBrowser: boolean;
  private batchBuffer: SerializedErrorReport[] = [];
  private captureCount = 0;
  private flushTimerId: ReturnType<typeof setInterval> | null = null;
  private visibilityHandler: (() => void) | null = null;

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);

    if (this.isBrowser) {
      this.startFlushTimer();
      this.registerVisibilityHandler();
    }

    inject(DestroyRef).onDestroy(() => this.dispose());
  }

  captureError(report: ErrorReport): void {
    try {
      const serialized = this.serializeReport(report);
      this.batchBuffer.push(serialized);
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
      this.batchBuffer = [];
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

  async flush(): Promise<void> {
    try {
      if (!this.endpoint || this.batchBuffer.length === 0) {
        return;
      }
      const batch = [...this.batchBuffer];
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch)
      });
      if (response.ok) {
        this.batchBuffer = [];
      }
    } catch {
      // Flush failure is non-critical — will retry next interval
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

  private startFlushTimer(): void {
    this.flushTimerId = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
  }

  private registerVisibilityHandler(): void {
    this.visibilityHandler = () => {
      if (document.visibilityState === 'hidden') {
        this.flushViaSendBeacon();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  private flushViaSendBeacon(): void {
    try {
      if (!this.endpoint || this.batchBuffer.length === 0) {
        return;
      }
      const data = JSON.stringify(this.batchBuffer);
      const sent = navigator.sendBeacon(this.endpoint, new Blob([data], { type: 'application/json' }));
      if (sent) {
        this.batchBuffer = [];
      }
    } catch {
      // sendBeacon failure is non-critical
    }
  }

  private dispose(): void {
    if (this.flushTimerId !== null) {
      clearInterval(this.flushTimerId);
      this.flushTimerId = null;
    }
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }
}
