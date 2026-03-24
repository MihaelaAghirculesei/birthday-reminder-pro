import { Injectable, inject, PLATFORM_ID, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';
import { Store } from '@ngrx/store';

import { PendingChangesService } from './pending-changes.service';
import { NetworkService } from './network.service';
import { LoggerService } from './logger.service';
import { CloudSyncService } from './cloud-sync.service';
import { SyncQueueProcessorService } from './sync-queue-processor.service';

import * as SyncActions from '../store/sync/sync.actions';
import * as AuthSelectors from '../store/auth/auth.selectors';

/**
 * Thin orchestrator: wires network, auth and pending-changes streams together,
 * then delegates all work to CloudSyncService and SyncQueueProcessorService.
 *
 * Public API is intentionally unchanged so all effects/consumers require no edits.
 */
@Injectable({
  providedIn: 'root'
})
export class SyncCoordinatorService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly store = inject(Store);
  private readonly cloudSync = inject(CloudSyncService);
  private readonly queueProcessor = inject(SyncQueueProcessorService);
  private readonly pendingChanges = inject(PendingChangesService);
  private readonly networkService = inject(NetworkService);
  private readonly logger = inject(LoggerService);
  private readonly destroyRef = inject(DestroyRef);

  private isInitialized = false;

  async initialize(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || this.isInitialized) return;

    this.isInitialized = true;

    await this.pendingChanges.initialize();
    this.queueProcessor.updatePendingCount();

    this.networkService.online$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((isOnline) => {
        this.store.dispatch(SyncActions.setOnlineStatus({ isOnline }));
      });

    this.store.select(AuthSelectors.selectAuthUser)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        if (user) {
          this.cloudSync.setupListeners(user.uid);
          this.cloudSync.checkForMigration(user.uid);
        } else {
          this.cloudSync.teardownListeners();
        }
      });

    this.pendingChanges.changes$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.queueProcessor.updatePendingCount();
      });

    this.logger.info('[SyncCoordinator] Initialized');
  }

  migrateLocalToCloud(): Promise<number> {
    return this.cloudSync.migrateLocalToCloud();
  }

  queueChange(
    entityType: 'birthday' | 'category',
    entityId: string,
    changeType: 'create' | 'update' | 'delete',
    data: unknown
  ): Promise<void> {
    return this.queueProcessor.queueChange(entityType, entityId, changeType, data);
  }

  processPendingChanges(): Promise<number> {
    return this.queueProcessor.processPendingChanges();
  }
}
