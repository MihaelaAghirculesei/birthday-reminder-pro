import { inject,Injectable } from '@angular/core';

import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';

import { TranslateService } from '@ngx-translate/core';
import { from,of } from 'rxjs';
import { catchError, exhaustMap, filter,map, switchMap, tap, withLatestFrom } from 'rxjs/operators';

import { type Birthday } from '../../../shared/models/birthday.model';
import { BirthdayMergeService } from '../../services/birthday-merge.service';
import { LoggerService } from '../../services/logger.service';
import { NotificationService } from '../../services/notification.service';
import { IndexedDBStorageService } from '../../services/offline-storage.service';
import { SyncCoordinatorService } from '../../services/sync-coordinator.service';
import * as AuthSelectors from '../auth/auth.selectors';
import * as BirthdayActions from '../birthday/birthday.actions';
import * as SyncActions from './sync.actions';

@Injectable()
export class SyncEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly syncCoordinator = inject(SyncCoordinatorService);
  private readonly offlineStorage = inject(IndexedDBStorageService);
  private readonly notificationService = inject(NotificationService);
  private readonly logger = inject(LoggerService);
  private readonly mergeService = inject(BirthdayMergeService);
  private readonly translate = inject(TranslateService);

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
            this.translate.instant('NOTIFICATIONS.FAILED_MIGRATION', { error }),
            'error',
            undefined,
            {
              label: this.translate.instant('NOTIFICATIONS.RETRY'),
              callback: () => this.store.dispatch(SyncActions.migrateLocalToCloud())
            }
          );
        })
      ),
    { dispatch: false }
  );

  cloudBirthdaysUpdated$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SyncActions.cloudBirthdaysUpdated),
      switchMap(({ birthdays }) =>
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

  pushPendingChanges$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SyncActions.pushPendingChanges),
      exhaustMap(() =>
        from(this.syncCoordinator.processPendingChanges()).pipe(
          map((syncedCount) => SyncActions.pushChangesSuccess({ syncedCount })),
          catchError((error) =>
            of(SyncActions.pushChangesFailure({ error: error.message }))
          )
        )
      )
    )
  );

  syncFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(SyncActions.syncFailure, SyncActions.pushChangesFailure),
        tap(({ error }) => {
          this.logger.error('[SyncEffects] Sync failed:', error);
          this.notificationService.show(
            this.translate.instant('NOTIFICATIONS.FAILED_SYNC', { error }),
            'error',
            undefined,
            {
              label: this.translate.instant('NOTIFICATIONS.RETRY'),
              callback: () => this.store.dispatch(SyncActions.pushPendingChanges())
            }
          );
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
