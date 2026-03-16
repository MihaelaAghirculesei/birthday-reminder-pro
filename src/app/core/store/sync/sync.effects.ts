import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of, from } from 'rxjs';
import { map, exhaustMap, catchError, tap, withLatestFrom, filter } from 'rxjs/operators';

import { SyncCoordinatorService } from '../../services/sync-coordinator.service';
import { IndexedDBStorageService } from '../../services/offline-storage.service';
import { NotificationService } from '../../services/notification.service';
import { LoggerService } from '../../services/logger.service';
import { BirthdayMergeService } from '../../services/birthday-merge.service';
import { Birthday } from '../../../shared/models/birthday.model';
import * as SyncActions from './sync.actions';
import * as AuthSelectors from '../auth/auth.selectors';
import * as BirthdayActions from '../birthday/birthday.actions';

@Injectable()
export class SyncEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly syncCoordinator = inject(SyncCoordinatorService);
  private readonly offlineStorage = inject(IndexedDBStorageService);
  private readonly notificationService = inject(NotificationService);
  private readonly logger = inject(LoggerService);
  private readonly mergeService = inject(BirthdayMergeService);

  migrateLocalToCloud$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SyncActions.migrateLocalToCloud),
      exhaustMap(() =>
        from(this.syncCoordinator.migrateLocalToCloud()).pipe(
          map((migratedCount) => SyncActions.migrationSuccess({ migratedCount })),
          catchError((error) =>
            of(SyncActions.migrationFailure({ error: error.message }))
          )
        )
      )
    )
  );

  migrationSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(SyncActions.migrationSuccess),
        tap(({ migratedCount }) => {
          if (migratedCount > 0) {
            this.notificationService.show(
              `${migratedCount} items synced to cloud`,
              'success'
            );
          }
        })
      ),
    { dispatch: false }
  );

  migrationFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(SyncActions.migrationFailure),
        tap(({ error }) => {
          this.notificationService.show(
            `Sync failed: ${error}`,
            'error'
          );
        })
      ),
    { dispatch: false }
  );

  cloudBirthdaysUpdated$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SyncActions.cloudBirthdaysUpdated),
      exhaustMap(({ birthdays }) =>
        from(this.mergeCloudBirthdays(birthdays)).pipe(
          map(() => SyncActions.syncSuccess({ timestamp: Date.now() })),
          catchError((error) =>
            of(SyncActions.syncFailure({ error: error.message }))
          )
        )
      )
    )
  );

  // When online status changes to online, trigger sync
  onlineStatusChanged$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SyncActions.setOnlineStatus),
      filter(({ isOnline }) => isOnline),
      withLatestFrom(this.store.select(AuthSelectors.selectIsAuthenticated)),
      filter(([, isAuthenticated]) => isAuthenticated),
      map(() => SyncActions.pushPendingChanges())
    )
  );

  pushPendingChanges$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(SyncActions.pushPendingChanges),
        tap(() => {
          this.syncCoordinator.processPendingChanges();
        })
      ),
    { dispatch: false }
  );

  syncFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(SyncActions.syncFailure, SyncActions.pushChangesFailure),
        tap(({ error }) => {
          this.logger.error('[SyncEffects] Sync failed:', error);
        })
      ),
    { dispatch: false }
  );

  private async mergeCloudBirthdays(cloudBirthdays: Birthday[]): Promise<void> {
    const localBirthdays = await this.offlineStorage.getBirthdays();

    const { merged } = this.mergeService.merge(localBirthdays, cloudBirthdays, {
      strategy: 'cloud-wins'
    });

    await this.offlineStorage.saveBirthdays(merged);
    this.store.dispatch(BirthdayActions.loadBirthdays());
  }
}
