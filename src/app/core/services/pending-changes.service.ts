import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { LoggerService } from './logger.service';

export type ChangeType = 'create' | 'update' | 'delete';
export type EntityType = 'birthday' | 'category';

export interface PendingChange {
  id: string;
  entityType: EntityType;
  entityId: string;
  changeType: ChangeType;
  data: unknown;
  timestamp: number;
  retryCount: number;
}

const PENDING_CHANGES_STORE = 'pendingChanges';
const DB_NAME = 'BirthdayReminderDB';
const DB_VERSION = 3;

@Injectable({
  providedIn: 'root'
})
export class PendingChangesService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly logger = inject(LoggerService);

  private changesSubject = new BehaviorSubject<PendingChange[]>([]);
  readonly changes$ = this.changesSubject.asObservable();

  get pendingCount(): number {
    return this.changesSubject.getValue().length;
  }

  get hasPendingChanges(): boolean {
    return this.pendingCount > 0;
  }

  async initialize(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const changes = await this.loadChanges();
    this.changesSubject.next(changes);
    this.logger.info('[PendingChanges] Initialized with', changes.length, 'pending changes');
  }

  async addChange(
    entityType: EntityType,
    entityId: string,
    changeType: ChangeType,
    data: unknown
  ): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const change: PendingChange = {
      id: `${entityType}-${entityId}-${Date.now()}`,
      entityType,
      entityId,
      changeType,
      data,
      timestamp: Date.now(),
      retryCount: 0
    };

    // Remove any existing pending change for the same entity
    const existing = this.changesSubject.getValue();
    const filtered = existing.filter(
      (c) => !(c.entityType === entityType && c.entityId === entityId)
    );

    // If it's a delete after a create that never synced, just remove both
    if (changeType === 'delete') {
      const hadPendingCreate = existing.some(
        (c) => c.entityType === entityType && c.entityId === entityId && c.changeType === 'create'
      );
      if (hadPendingCreate) {
        await this.saveChanges(filtered);
        this.changesSubject.next(filtered);
        this.logger.info('[PendingChanges] Cancelled pending create for deleted entity');
        return;
      }
    }

    const updated = [...filtered, change];
    await this.saveChanges(updated);
    this.changesSubject.next(updated);
    this.logger.info('[PendingChanges] Added change:', changeType, entityType, entityId);
  }

  async removeChange(changeId: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const changes = this.changesSubject.getValue();
    const updated = changes.filter((c) => c.id !== changeId);
    await this.saveChanges(updated);
    this.changesSubject.next(updated);
  }

  async markRetry(changeId: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const changes = this.changesSubject.getValue();
    const updated = changes.map((c) =>
      c.id === changeId ? { ...c, retryCount: c.retryCount + 1 } : c
    );
    await this.saveChanges(updated);
    this.changesSubject.next(updated);
  }

  async clearAll(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    await this.saveChanges([]);
    this.changesSubject.next([]);
    this.logger.info('[PendingChanges] Cleared all pending changes');
  }

  getChangesForEntity(entityType: EntityType): PendingChange[] {
    return this.changesSubject.getValue().filter((c) => c.entityType === entityType);
  }

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

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

        if (!db.objectStoreNames.contains(PENDING_CHANGES_STORE)) {
          const pendingStore = db.createObjectStore(PENDING_CHANGES_STORE, { keyPath: 'id' });
          pendingStore.createIndex('entityType', 'entityType', { unique: false });
          pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  private async loadChanges(): Promise<PendingChange[]> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([PENDING_CHANGES_STORE], 'readonly');
        const store = transaction.objectStore(PENDING_CHANGES_STORE);
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const changes = (request.result || []).sort((a, b) => a.timestamp - b.timestamp);
          resolve(changes);
        };
      });
    } catch (error) {
      this.logger.error('[PendingChanges] Failed to load changes:', error);
      return [];
    }
  }

  private async saveChanges(changes: PendingChange[]): Promise<void> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([PENDING_CHANGES_STORE], 'readwrite');
        const store = transaction.objectStore(PENDING_CHANGES_STORE);

        store.clear();
        changes.forEach((change) => store.add(change));

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      this.logger.error('[PendingChanges] Failed to save changes:', error);
      throw error;
    }
  }
}
