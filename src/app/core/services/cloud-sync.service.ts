import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { Subscription, firstValueFrom } from 'rxjs';

import { FirebaseAuthService } from './firebase-auth.service';
import { FirestoreService } from './firestore.service';
import { IndexedDBStorageService } from './offline-storage.service';
import { NetworkService } from './network.service';
import { LoggerService } from './logger.service';
import { BirthdayMergeService } from './birthday-merge.service';
import { Birthday } from '../../shared/models/birthday.model';

import * as SyncActions from '../store/sync/sync.actions';

/**
 * Manages Firestore real-time listeners and cloud↔local data migration/merge.
 * Extracted from SyncCoordinatorService to isolate cloud connectivity concerns.
 */
@Injectable({
  providedIn: 'root'
})
export class CloudSyncService {
  private readonly store = inject(Store);
  private readonly authService = inject(FirebaseAuthService);
  private readonly firestoreService = inject(FirestoreService);
  private readonly offlineStorage = inject(IndexedDBStorageService);
  private readonly networkService = inject(NetworkService);
  private readonly mergeService = inject(BirthdayMergeService);
  private readonly logger = inject(LoggerService);
  private readonly destroyRef = inject(DestroyRef);

  private subscriptions: Subscription[] = [];
  private hasActiveListeners = false;

  constructor() {
    this.destroyRef.onDestroy(() => this.teardownListeners());
  }

  setupListeners(userId: string): void {
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
    this.logger.info('[CloudSync] Listeners setup for user:', userId);
  }

  teardownListeners(): void {
    if (!this.hasActiveListeners) return;

    this.firestoreService.unsubscribeAll();
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions = [];
    this.hasActiveListeners = false;
    this.logger.info('[CloudSync] Listeners torn down');
  }

  async checkForMigration(userId: string): Promise<void> {
    try {
      const cloudBirthdays = await firstValueFrom(this.firestoreService.getBirthdays(userId));

      if (cloudBirthdays && cloudBirthdays.length > 0) {
        this.logger.info('[CloudSync] User has cloud data, merging...');
        await this.mergeCloudWithLocal(cloudBirthdays, userId);
      } else {
        const localBirthdays = await this.offlineStorage.getBirthdays();
        if (localBirthdays.length > 0) {
          this.logger.info('[CloudSync] Migrating local data to cloud...');
          this.store.dispatch(SyncActions.migrateLocalToCloud());
        }
      }
    } catch (error) {
      this.logger.error('[CloudSync] Migration check failed:', error);
    }
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

    this.logger.info('[CloudSync] Migration complete:', birthdaysWithMeta.length, 'items');
    return birthdaysWithMeta.length;
  }

  async mergeCloudWithLocal(cloudBirthdays: Birthday[], userId: string): Promise<void> {
    const localBirthdays = await this.offlineStorage.getBirthdays();

    const { merged, toUpload } = this.mergeService.merge(localBirthdays, cloudBirthdays, {
      strategy: 'latest-wins'
    });

    await this.offlineStorage.saveBirthdays(merged);

    if (toUpload.length > 0 && this.networkService.isOnline) {
      await firstValueFrom(this.firestoreService.saveBirthdaysBatch(userId, toUpload));
    }

    this.store.dispatch(SyncActions.syncSuccess({ timestamp: Date.now() }));
    this.logger.info('[CloudSync] Merge complete. Total:', merged.length);
  }
}
