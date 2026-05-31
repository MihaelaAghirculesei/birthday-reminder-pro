import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

import { BehaviorSubject } from 'rxjs';

import type { ValidatedBirthday, ValidatedCategory } from '../../shared/schemas/birthday.schema';
import { IndexedDBConnectionService } from './indexeddb-connection.service';
import { LoggerService } from './logger.service';

export type ChangeType = 'create' | 'update' | 'delete';
export type EntityType = 'birthday' | 'category';

/**
 * Discriminated union for data carried by a PendingChange.
 * create/update ops carry the full validated entity; delete ops carry null
 * (the entity id is already stored in PendingChange.entityId).
 */
export type SyncPayloadData = ValidatedBirthday | ValidatedCategory | null;

export interface PendingChange {
  id: string;
  entityType: EntityType;
  entityId: string;
  changeType: ChangeType;
  data: SyncPayloadData;
  timestamp: number;
  retryCount: number;
  /**
   * Monotonically increasing counter that establishes global causal ordering across all
   * pending operations. Critical for delete→create sequences: the sync processor uses
   * this to guarantee that a delete is never retried after its subsequent create has
   * already been applied to the remote store.
   */
  sequenceNumber: number;
}

const PENDING_CHANGES_STORE = 'pendingChanges';

@Injectable({
  providedIn: 'root'
})
export class PendingChangesService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly logger = inject(LoggerService);
  private readonly connection = inject(IndexedDBConnectionService);

  private changesSubject = new BehaviorSubject<PendingChange[]>([]);
  readonly changes$ = this.changesSubject.asObservable();

  /** Monotonically increasing; restored from IndexedDB on initialize(). */
  private sequenceCounter = 0;

  get pendingCount(): number {
    return this.changesSubject.getValue().length;
  }

  get hasPendingChanges(): boolean {
    return this.pendingCount > 0;
  }

  async initialize(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const changes = await this.loadChanges();
    if (changes.length > 0) {
      this.sequenceCounter = Math.max(...changes.map((c) => c.sequenceNumber)) + 1;
    }
    this.changesSubject.next(changes);
    this.logger.info('[PendingChanges] Initialized with', changes.length, 'pending changes');
  }

  async addChange(
    entityType: EntityType,
    entityId: string,
    changeType: ChangeType,
    data: SyncPayloadData
  ): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const existing = this.changesSubject.getValue();
    const forEntity = existing.filter(
      (c) => c.entityType === entityType && c.entityId === entityId
    );

    const seq = this.sequenceCounter++;
    const change: PendingChange = {
      // Include seq so IDs stay unique even if two ops arrive within the same millisecond
      // (e.g. delete→create for the same entity, which keeps both in the queue).
      id: `${entityType}-${entityId}-${Date.now()}-${seq}`,
      entityType,
      entityId,
      changeType,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      sequenceNumber: seq
    };

    const hasPendingDelete = forEntity.some((c) => c.changeType === 'delete');
    const hasPendingCreate = forEntity.some((c) => c.changeType === 'create');

    // --- Collapse rules (per-entity operation folding) ---

    if (changeType === 'delete') {
      if (hasPendingDelete && hasPendingCreate) {
        // [delete, create] → delete: cancel the re-create, replace with fresh delete.
        // The original entity was already deleted remotely (or will be); the re-create is now void.
        const withoutEntity = existing.filter(
          (c) => !(c.entityType === entityType && c.entityId === entityId)
        );
        const updated = [...withoutEntity, change];
        await this.saveChanges(updated);
        this.changesSubject.next(updated);
        this.logger.info('[PendingChanges] Collapsed delete→create→delete to single delete');
        return;
      }

      if (hasPendingCreate && !hasPendingDelete) {
        // create → delete: entity was never synced remotely — cancel both.
        const filtered = existing.filter(
          (c) => !(c.entityType === entityType && c.entityId === entityId)
        );
        await this.saveChanges(filtered);
        this.changesSubject.next(filtered);
        this.logger.info('[PendingChanges] Cancelled pending create for deleted entity');
        return;
      }

      // Fresh delete, or update → delete: replace any pending update with the delete.
      const withoutEntity = existing.filter(
        (c) => !(c.entityType === entityType && c.entityId === entityId)
      );
      const updated = [...withoutEntity, change];
      await this.saveChanges(updated);
      this.changesSubject.next(updated);
      this.logger.info('[PendingChanges] Added change:', changeType, entityType, entityId);
      return;
    }

    if (changeType === 'create') {
      if (hasPendingDelete && !hasPendingCreate) {
        // delete → create: PRESERVE CAUSAL ORDER.
        //
        // Do NOT collapse to just `create`. Keeping both ops ensures the sync processor
        // will send the delete to the remote store before creating the new entity.
        // The sync loop enforces entity-level ordering and blocks `create` until its
        // preceding `delete` has been confirmed, preventing the retry race condition
        // where a stale delete retry would wipe out the freshly created entity.
        const updated = [...existing, change];
        await this.saveChanges(updated);
        this.changesSubject.next(updated);
        this.logger.info('[PendingChanges] Preserved delete→create causal sequence for entity:', entityId);
        return;
      }

      // All other cases (no pending ops, create → create, update → create):
      // replace the entity's pending ops with the new create.
      const withoutEntity = existing.filter(
        (c) => !(c.entityType === entityType && c.entityId === entityId)
      );
      const updated = [...withoutEntity, change];
      await this.saveChanges(updated);
      this.changesSubject.next(updated);
      this.logger.info('[PendingChanges] Added change:', changeType, entityType, entityId);
      return;
    }

    if (changeType === 'update') {
      if (hasPendingCreate) {
        // create → update (or [delete, create] → update): absorb into the pending create.
        // The create already carries the full entity payload; just refresh its data.
        const updated = existing.map((c) =>
          c.entityType === entityType && c.entityId === entityId && c.changeType === 'create'
            ? { ...c, data, timestamp: Date.now() }
            : c
        );
        await this.saveChanges(updated);
        this.changesSubject.next(updated);
        this.logger.info('[PendingChanges] Merged update into pending create for entity:', entityId);
        return;
      }

      // update → update: replace the stale update (keep pending delete untouched if present).
      const withoutUpdate = existing.filter(
        (c) => !(c.entityType === entityType && c.entityId === entityId && c.changeType === 'update')
      );
      const updated = [...withoutUpdate, change];
      await this.saveChanges(updated);
      this.changesSubject.next(updated);
      this.logger.info('[PendingChanges] Added change:', changeType, entityType, entityId);
    }
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

  private async loadChanges(): Promise<PendingChange[]> {
    try {
      const db = await this.connection.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([PENDING_CHANGES_STORE], 'readonly');
        const store = transaction.objectStore(PENDING_CHANGES_STORE);
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          // Sort by timestamp first so legacy records get monotonically assigned sequence numbers.
          const raw = (request.result || []) as Partial<PendingChange>[];
          const byTimestamp = raw.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));

          // Assign sequenceNumber to legacy records that predate this field.
          const changes: PendingChange[] = byTimestamp.map((c, i) => ({
            ...c,
            sequenceNumber: c.sequenceNumber ?? i
          } as PendingChange));

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
      const db = await this.connection.getDB();
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
