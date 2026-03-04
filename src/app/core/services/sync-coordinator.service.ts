import { Injectable, inject, PLATFORM_ID, DestroyRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Store } from '@ngrx/store';
import { Subject, Subscription, take } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { FirebaseAuthService } from './firebase-auth.service';
import { FirestoreService } from './firestore.service';
import { IndexedDBStorageService } from './offline-storage.service';
import { PendingChangesService, PendingChange } from './pending-changes.service';
import { NetworkService } from './network.service';
import { LoggerService } from './logger.service';
import { Birthday, Category } from '../../shared/models/birthday.model';

import * as SyncActions from '../store/sync/sync.actions';
import * as AuthSelectors from '../store/auth/auth.selectors';
const MAX_RETRY_COUNT = 3;

@Injectable({
  providedIn: 'root'
})
export class SyncCoordinatorService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly store = inject(Store);
  private readonly authService = inject(FirebaseAuthService);
  private readonly firestoreService = inject(FirestoreService);
  private readonly offlineStorage = inject(IndexedDBStorageService);
  private readonly pendingChanges = inject(PendingChangesService);
  private readonly networkService = inject(NetworkService);
  private readonly logger = inject(LoggerService);

  private readonly destroyRef = inject(DestroyRef);
  private readonly destroy$ = new Subject<void>();
  private subscriptions: Subscription[] = [];
  private isInitialized = false;
  private hasActiveListeners = false;

  async initialize(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || this.isInitialized) return;

    this.isInitialized = true;

    // Initialize pending changes from IndexedDB
    await this.pendingChanges.initialize();
    this.updatePendingCount();

    // Monitor network status
    this.networkService.online$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isOnline) => {
        this.store.dispatch(SyncActions.setOnlineStatus({ isOnline }));
        if (isOnline) {
          this.processPendingChanges();
        }
      });

    // Monitor auth state and setup listeners when authenticated
    this.store.select(AuthSelectors.selectAuthUser)
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        if (user) {
          this.setupCloudListeners(user.uid);
          this.checkForMigration(user.uid);
        } else {
          this.teardownCloudListeners();
        }
      });

    // Monitor pending changes count
    this.pendingChanges.changes$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updatePendingCount();
      });

    this.logger.info('[SyncCoordinator] Initialized');
  }

  private setupCloudListeners(userId: string): void {
    this.firestoreService.subscribeToBirthdays(userId);
    this.firestoreService.subscribeToCategories(userId);

    // Handle incoming cloud updates
    const birthdaysSub = this.firestoreService.birthdays$
      .pipe(takeUntil(this.destroy$))
      .subscribe((birthdays) => {
        this.store.dispatch(SyncActions.cloudBirthdaysUpdated({ birthdays }));
      });

    const categoriesSub = this.firestoreService.categories$
      .pipe(takeUntil(this.destroy$))
      .subscribe((categories) => {
        this.store.dispatch(SyncActions.cloudCategoriesUpdated({ categories }));
      });

    this.subscriptions.push(birthdaysSub, categoriesSub);
    this.hasActiveListeners = true;
    this.logger.info('[SyncCoordinator] Cloud listeners setup for user:', userId);
  }

  private teardownCloudListeners(): void {
    if (!this.hasActiveListeners) return;

    this.firestoreService.unsubscribeAll();
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions = [];
    this.hasActiveListeners = false;
    this.logger.info('[SyncCoordinator] Cloud listeners torn down');
  }

  private async checkForMigration(userId: string): Promise<void> {
    try {
      // Check if user has data in cloud
      const cloudBirthdays = await this.firestoreService.getBirthdays(userId).pipe(take(1)).toPromise();

      if (cloudBirthdays && cloudBirthdays.length > 0) {
        // User has cloud data - merge with local
        this.logger.info('[SyncCoordinator] User has cloud data, merging...');
        await this.mergeCloudWithLocal(cloudBirthdays, userId);
      } else {
        // User has no cloud data - migrate local to cloud
        const localBirthdays = await this.offlineStorage.getBirthdays();
        if (localBirthdays.length > 0) {
          this.logger.info('[SyncCoordinator] Migrating local data to cloud...');
          this.store.dispatch(SyncActions.migrateLocalToCloud());
        }
      }
    } catch (error) {
      this.logger.error('[SyncCoordinator] Migration check failed:', error);
    }
  }

  private async mergeCloudWithLocal(cloudBirthdays: Birthday[], userId: string): Promise<void> {
    const localBirthdays = await this.offlineStorage.getBirthdays();

    // Create map for quick lookup
    const cloudMap = new Map(cloudBirthdays.map((b) => [b.id, b]));
    const localMap = new Map(localBirthdays.map((b) => [b.id, b]));

    const merged: Birthday[] = [];
    const toUpload: Birthday[] = [];

    // Process cloud items
    for (const cloudItem of cloudBirthdays) {
      const localItem = localMap.get(cloudItem.id);

      if (!localItem) {
        // Cloud-only item
        merged.push(cloudItem);
      } else {
        // Exists in both - use last-write-wins
        const winner = this.resolveConflict(localItem, cloudItem);
        merged.push(winner);

        if (winner === localItem && (localItem.updatedAt || 0) > (cloudItem.updatedAt || 0)) {
          toUpload.push(localItem);
        }
      }
    }

    // Add local-only items (need to upload)
    for (const localItem of localBirthdays) {
      if (!cloudMap.has(localItem.id)) {
        merged.push(localItem);
        toUpload.push(localItem);
      }
    }

    // Save merged data locally
    await this.offlineStorage.saveBirthdays(merged);

    // Upload local-only items to cloud
    if (toUpload.length > 0 && this.networkService.isOnline) {
      await this.firestoreService.saveBirthdaysBatch(userId, toUpload).pipe(take(1)).toPromise();
    }

    this.store.dispatch(SyncActions.syncSuccess({ timestamp: Date.now() }));
    this.logger.info('[SyncCoordinator] Merge complete. Total:', merged.length);
  }

  private resolveConflict(local: Birthday, cloud: Birthday): Birthday {
    const localTime = local.updatedAt || 0;
    const cloudTime = cloud.updatedAt || 0;

    // If timestamps are equal, prefer cloud (server authority)
    if (localTime === cloudTime) {
      return cloud;
    }

    // If timestamps differ significantly (>1s), use last-write-wins
    if (Math.abs(localTime - cloudTime) > 1000) {
      return localTime > cloudTime ? local : cloud;
    }

    // Near-simultaneous edits: merge fields, prefer newer non-empty values
    const winner = localTime > cloudTime ? local : cloud;
    const loser = localTime > cloudTime ? cloud : local;

    return {
      ...loser,
      ...winner,
      // Preserve notes from both if winner has none
      notes: winner.notes || loser.notes,
      // Preserve category if winner lost it
      category: winner.category || loser.category,
      // Keep the latest updatedAt
      updatedAt: Math.max(localTime, cloudTime),
      syncStatus: 'synced' as const
    };
  }

  async migrateLocalToCloud(): Promise<number> {
    const userId = this.authService.currentUser?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const localBirthdays = await this.offlineStorage.getBirthdays();
    if (localBirthdays.length === 0) {
      return 0;
    }

    // Add sync metadata to local birthdays
    const birthdaysWithMeta: Birthday[] = localBirthdays.map((b) => ({
      ...b,
      ownerId: userId,
      updatedAt: b.updatedAt || Date.now(),
      syncStatus: 'synced' as const
    }));

    // Upload to cloud
    await this.firestoreService.saveBirthdaysBatch(userId, birthdaysWithMeta).pipe(take(1)).toPromise();

    // Update local storage with sync metadata
    await this.offlineStorage.saveBirthdays(birthdaysWithMeta);

    this.logger.info('[SyncCoordinator] Migration complete:', birthdaysWithMeta.length, 'items');
    return birthdaysWithMeta.length;
  }

  async queueChange(
    entityType: 'birthday' | 'category',
    entityId: string,
    changeType: 'create' | 'update' | 'delete',
    data: unknown
  ): Promise<void> {
    await this.pendingChanges.addChange(entityType, entityId, changeType, data);

    // If online and authenticated, process immediately
    if (this.networkService.isOnline && this.authService.isAuthenticated) {
      this.processPendingChanges();
    }
  }

  async processPendingChanges(): Promise<void> {
    const userId = this.authService.currentUser?.uid;
    if (!userId || !this.networkService.isOnline) return;

    const changes = this.pendingChanges.getChangesForEntity('birthday');
    if (changes.length === 0) return;

    this.store.dispatch(SyncActions.pushPendingChanges());
    let syncedCount = 0;

    for (const change of changes) {
      if (change.retryCount >= MAX_RETRY_COUNT) {
        this.logger.warn('[SyncCoordinator] Max retries reached for change:', change.id);
        continue;
      }

      try {
        await this.processChange(userId, change);
        await this.pendingChanges.removeChange(change.id);
        syncedCount++;
      } catch (error) {
        this.logger.error('[SyncCoordinator] Failed to process change:', error);
        await this.pendingChanges.markRetry(change.id);
      }
    }

    if (syncedCount > 0) {
      this.store.dispatch(SyncActions.pushChangesSuccess({ syncedCount }));
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
      case 'update':
        await this.firestoreService
          .saveBirthday(userId, change.data as Birthday)
          .pipe(take(1))
          .toPromise();
        break;
      case 'delete':
        await this.firestoreService
          .deleteBirthday(userId, change.entityId)
          .pipe(take(1))
          .toPromise();
        break;
    }
  }

  private async processCategoryChange(userId: string, change: PendingChange): Promise<void> {
    switch (change.changeType) {
      case 'create':
      case 'update':
        await this.firestoreService
          .saveCategory(userId, change.data as Category)
          .pipe(take(1))
          .toPromise();
        break;
      case 'delete':
        await this.firestoreService
          .deleteCategory(userId, change.entityId)
          .pipe(take(1))
          .toPromise();
        break;
    }
  }

  private updatePendingCount(): void {
    const count = this.pendingChanges.pendingCount;
    this.store.dispatch(SyncActions.updatePendingCount({ count }));
  }

  constructor() {
    try {
      this.destroyRef.onDestroy(() => {
        this.destroy$.next();
        this.destroy$.complete();
        this.teardownCloudListeners();
      });
    } catch (e) {
      this.logger.warn('[SyncCoordinator] DestroyRef not available:', e);
    }
  }
}
