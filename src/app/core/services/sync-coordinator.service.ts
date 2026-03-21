import { Injectable, inject, PLATFORM_ID, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';
import { Store } from '@ngrx/store';
import { Subscription, firstValueFrom } from 'rxjs';

import { FirebaseAuthService } from './firebase-auth.service';
import { FirestoreService } from './firestore.service';
import { IndexedDBStorageService } from './offline-storage.service';
import { PendingChangesService, PendingChange } from './pending-changes.service';
import { NetworkService } from './network.service';
import { LoggerService } from './logger.service';
import { BirthdayMergeService } from './birthday-merge.service';
import { Birthday } from '../../shared/models/birthday.model';
import { safeParseBirthday, safeParseCategory } from '../../shared/schemas/birthday.schema';

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
  private readonly mergeService = inject(BirthdayMergeService);
  private readonly destroyRef = inject(DestroyRef);

  private subscriptions: Subscription[] = [];
  private isInitialized = false;
  private hasActiveListeners = false;
  private isSyncing = false;
  private syncAgain = false;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.teardownCloudListeners();
    });
  }

  async initialize(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || this.isInitialized) return;

    this.isInitialized = true;

    await this.pendingChanges.initialize();
    this.updatePendingCount();

    this.networkService.online$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((isOnline) => {
        this.store.dispatch(SyncActions.setOnlineStatus({ isOnline }));
      });

    this.store.select(AuthSelectors.selectAuthUser)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        if (user) {
          this.setupCloudListeners(user.uid);
          this.checkForMigration(user.uid);
        } else {
          this.teardownCloudListeners();
        }
      });

    this.pendingChanges.changes$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.updatePendingCount();
      });

    this.logger.info('[SyncCoordinator] Initialized');
  }

  private setupCloudListeners(userId: string): void {
    this.firestoreService.subscribeToBirthdays(userId);
    this.firestoreService.subscribeToCategories(userId);

    const birthdaysSub = this.firestoreService.birthdays$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((birthdays) => {
        this.store.dispatch(SyncActions.cloudBirthdaysUpdated({ birthdays }));
      });

    const categoriesSub = this.firestoreService.categories$
      .pipe(takeUntilDestroyed(this.destroyRef))
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
      const cloudBirthdays = await firstValueFrom(this.firestoreService.getBirthdays(userId));

      if (cloudBirthdays && cloudBirthdays.length > 0) {
        this.logger.info('[SyncCoordinator] User has cloud data, merging...');
        await this.mergeCloudWithLocal(cloudBirthdays, userId);
      } else {
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

    const { merged, toUpload } = this.mergeService.merge(localBirthdays, cloudBirthdays, {
      strategy: 'latest-wins'
    });

    await this.offlineStorage.saveBirthdays(merged);

    if (toUpload.length > 0 && this.networkService.isOnline) {
      await firstValueFrom(this.firestoreService.saveBirthdaysBatch(userId, toUpload));
    }

    this.store.dispatch(SyncActions.syncSuccess({ timestamp: Date.now() }));
    this.logger.info('[SyncCoordinator] Merge complete. Total:', merged.length);
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

    const birthdaysWithMeta: Birthday[] = localBirthdays.map((b) => ({
      ...b,
      ownerId: userId,
      updatedAt: b.updatedAt || Date.now(),
      syncStatus: 'synced' as const
    }));

    await firstValueFrom(this.firestoreService.saveBirthdaysBatch(userId, birthdaysWithMeta));

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

    this.isSyncing = true;
    try {
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
        const result = safeParseBirthday(change.data);
        if (!result.success) {
          this.logger.error('[Sync] Skipping invalid birthday pending change:', change.entityId, result.error.issues);
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
        const result = safeParseCategory(change.data);
        if (!result.success) {
          this.logger.error('[Sync] Skipping invalid category pending change:', change.entityId, result.error.issues);
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

  private updatePendingCount(): void {
    const count = this.pendingChanges.pendingCount;
    this.store.dispatch(SyncActions.updatePendingCount({ count }));
  }
}
