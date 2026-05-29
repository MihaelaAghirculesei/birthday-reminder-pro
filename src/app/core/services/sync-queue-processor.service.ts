import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';

import { FirebaseAuthService } from './firebase-auth.service';
import { FirestoreService } from './firestore.service';
import { PendingChangesService, PendingChange, EntityType, ChangeType, SyncPayloadData } from './pending-changes.service';
import { NetworkService } from './network.service';
import { LoggerService } from './logger.service';
import type { ValidatedBirthday, ValidatedCategory } from '../../shared/schemas/birthday.schema';

import * as SyncActions from '../store/sync/sync.actions';

const MAX_RETRY_COUNT = 3;
const BATCH_SIZE = 100;

/**
 * Processes the offline pending-changes queue: queuing, causal-order enforcement,
 * retry logic and concurrency guard.
 * Extracted from SyncCoordinatorService to isolate write-sync concerns.
 */
@Injectable({
  providedIn: 'root'
})
export class SyncQueueProcessorService {
  private readonly store = inject(Store);
  private readonly authService = inject(FirebaseAuthService);
  private readonly firestoreService = inject(FirestoreService);
  private readonly pendingChanges = inject(PendingChangesService);
  private readonly networkService = inject(NetworkService);
  private readonly logger = inject(LoggerService);

  private isSyncing = false;
  private syncAgain = false;

  updatePendingCount(): void {
    const count = this.pendingChanges.pendingCount;
    this.store.dispatch(SyncActions.updatePendingCount({ count }));
  }

  queueChange(entityType: 'birthday', entityId: string, changeType: 'create' | 'update', data: ValidatedBirthday): Promise<void>;
  queueChange(entityType: 'birthday', entityId: string, changeType: 'delete', data?: null): Promise<void>;
  queueChange(entityType: 'category', entityId: string, changeType: 'create' | 'update', data: ValidatedCategory): Promise<void>;
  queueChange(entityType: 'category', entityId: string, changeType: 'delete', data?: null): Promise<void>;
  async queueChange(
    entityType: EntityType,
    entityId: string,
    changeType: ChangeType,
    data?: ValidatedBirthday | ValidatedCategory | null
  ): Promise<void> {
    // Validate at the queue boundary — fail fast rather than silently storing
    // corrupt data that would only surface as a Firestore error during sync.
    let payload: SyncPayloadData = null;

    if (changeType !== 'delete') {
      const { safeParseBirthday, safeParseCategory } = await import('../../shared/schemas/birthday.schema');
      const result = entityType === 'birthday'
        ? safeParseBirthday(data)
        : safeParseCategory(data);

      if (!result.success) {
        const msg = `[SyncQueueProcessor] Refusing to enqueue invalid ${entityType} (${changeType}): ${JSON.stringify(result.error.issues)}`;
        this.logger.error(msg);
        throw new Error(msg);
      }
      // Use the Zod-parsed output: coercions applied, unknown keys stripped.
      payload = result.data;
    }

    await this.pendingChanges.addChange(entityType, entityId, changeType, payload);

    if (this.networkService.isOnline && this.authService.isAuthenticated) {
      this.store.dispatch(SyncActions.pushPendingChanges());
    }
  }

  async processPendingChanges(): Promise<number> {
    if (this.isSyncing) {
      this.syncAgain = true;
      return 0;
    }

    const userId = this.authService.currentUser?.uid;
    if (!userId || !this.networkService.isOnline) return 0;

    const changes = this.pendingChanges.getChangesForEntity('birthday');
    if (changes.length === 0) return 0;

    // Sort by sequenceNumber to guarantee causal ordering across all ops.
    // For delete→create pairs on the same entity this is critical: the delete
    // MUST reach Firestore before the create; otherwise a stale delete retry
    // could silently wipe out the freshly created entity on the next sync pass.
    const sorted = [...changes].sort(
      (a, b) => (a.sequenceNumber ?? a.timestamp) - (b.sequenceNumber ?? b.timestamp)
    );

    this.isSyncing = true;
    try {
      let syncedCount = 0;
      // Tracks entity keys (entityType:entityId) whose causal chain has a failed op.
      // Subsequent ops for the same entity are held back for the next sync round.
      const failedEntityKeys = new Set<string>();
      const total = sorted.length;

      for (let batchStart = 0; batchStart < total; batchStart += BATCH_SIZE) {
        const batch = sorted.slice(batchStart, batchStart + BATCH_SIZE);

        for (const change of batch) {
          const entityKey = `${change.entityType}:${change.entityId}`;

          if (failedEntityKeys.has(entityKey)) {
            // A prior op for this entity failed — skip to preserve causal order.
            this.logger.warn('[SyncQueueProcessor] Skipping change blocked by prior entity failure:', change.id);
            continue;
          }

          if (change.retryCount >= MAX_RETRY_COUNT) {
            this.logger.warn('[SyncQueueProcessor] Max retries reached for change:', change.id);
            // Block subsequent ops for this entity: if the delete is permanently stuck,
            // attempting the create would leave the remote store in an inconsistent state.
            failedEntityKeys.add(entityKey);
            continue;
          }

          try {
            await this.processChange(userId, change);
            await this.pendingChanges.removeChange(change.id);
            syncedCount++;
          } catch (error) {
            this.logger.error('[SyncQueueProcessor] Failed to process change:', error);
            await this.pendingChanges.markRetry(change.id);
            failedEntityKeys.add(entityKey);
          }
        }

        const completed = batchStart + batch.length;
        this.store.dispatch(SyncActions.batchSyncProgress({ completed, total }));
        this.updatePendingCount();
      }

      return syncedCount;
    } finally {
      this.isSyncing = false;
      if (this.syncAgain) {
        this.syncAgain = false;
        this.store.dispatch(SyncActions.pushPendingChanges());
      }
    }
  }

  private async processChange(userId: string, change: PendingChange): Promise<void> {
    switch (change.entityType) {
      case 'birthday':
        await this.processBirthdayChange(userId, change);
        break;
      case 'category':
        await this.processCategoryChange(userId, change);
        break;
    }
  }

  private async processBirthdayChange(userId: string, change: PendingChange): Promise<void> {
    switch (change.changeType) {
      case 'create':
      case 'update': {
        const { safeParseBirthday } = await import('../../shared/schemas/birthday.schema');
        const result = safeParseBirthday(change.data);
        if (!result.success) {
          this.logger.error('[SyncQueueProcessor] Skipping invalid birthday pending change:', change.entityId, result.error.issues);
          return;
        }
        await firstValueFrom(this.firestoreService.saveBirthday(userId, result.data));
        break;
      }
      case 'delete':
        await firstValueFrom(this.firestoreService.deleteBirthday(userId, change.entityId));
        break;
    }
  }

  private async processCategoryChange(userId: string, change: PendingChange): Promise<void> {
    switch (change.changeType) {
      case 'create':
      case 'update': {
        const { safeParseCategory } = await import('../../shared/schemas/birthday.schema');
        const result = safeParseCategory(change.data);
        if (!result.success) {
          this.logger.error('[SyncQueueProcessor] Skipping invalid category pending change:', change.entityId, result.error.issues);
          return;
        }
        await firstValueFrom(this.firestoreService.saveCategory(userId, result.data));
        break;
      }
      case 'delete':
        await firstValueFrom(this.firestoreService.deleteCategory(userId, change.entityId));
        break;
    }
  }
}
