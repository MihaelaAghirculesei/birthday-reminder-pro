import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType, OnInitEffects } from '@ngrx/effects';
import { Action, Store } from '@ngrx/store';
import { of, from, forkJoin } from 'rxjs';
import { catchError, map, mergeMap, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import * as BirthdayActions from './birthday.actions';
import { IndexedDBStorageService } from '../../services/offline-storage.service';
import { BirthdayService } from '../../services/birthday.service';
import { SyncCoordinatorService } from '../../services/sync-coordinator.service';
import { PushNotificationService } from '../../services/push-notification.service';
import { Birthday } from '../../../shared/models/birthday.model';
import * as AuthSelectors from '../auth/auth.selectors';

@Injectable()
export class BirthdayCrudEffects implements OnInitEffects {

  ngrxOnInitEffects(): Action {
    return BirthdayActions.loadBirthdays();
  }

  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly offlineStorage = inject(IndexedDBStorageService);
  private readonly birthdayService = inject(BirthdayService);
  private readonly syncCoordinator = inject(SyncCoordinatorService);
  private readonly pushNotificationService = inject(PushNotificationService);

  loadBirthdays$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BirthdayActions.loadBirthdays),
      switchMap(() =>
        from(this.offlineStorage.getBirthdays()).pipe(
          map(birthdays => birthdays.map(b => this.birthdayService.normalizeBirthdayOnLoad(b))),
          map(birthdays => BirthdayActions.loadBirthdaysSuccess({ birthdays })),
          catchError(error => of(BirthdayActions.loadBirthdaysFailure({ error: error.message })))
        )
      )
    )
  );

  addBirthday$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BirthdayActions.addBirthday),
      withLatestFrom(this.store.select(AuthSelectors.selectUserId)),
      mergeMap(([{ birthday }, userId]) => {
        const newBirthday = this.birthdayService.prepareBirthdayForCreate(birthday, userId);

        return from(this.birthdayService.syncToGoogleCalendar(newBirthday)).pipe(
          tap(eventId => {
            if (eventId) {
              newBirthday.googleCalendarEventId = eventId;
            }
          }),
          switchMap(() => from(this.offlineStorage.addBirthday(newBirthday))),
          switchMap(() => userId
            ? from(this.syncCoordinator.queueChange('birthday', newBirthday.id, 'create', newBirthday))
            : of(undefined)
          ),
          map(() => BirthdayActions.addBirthdaySuccess({ birthday: newBirthday })),
          catchError(error => of(BirthdayActions.addBirthdayFailure({ error: error.message })))
        );
      })
    )
  );

  updateBirthday$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BirthdayActions.updateBirthday),
      withLatestFrom(this.store.select(AuthSelectors.selectUserId)),
      mergeMap(([{ birthday }, userId]) => {
        const normalizedBirthday = this.birthdayService.prepareBirthdayForUpdate(birthday, userId);

        return from(this.birthdayService.updateGoogleCalendar(normalizedBirthday)).pipe(
          switchMap(() => from(this.offlineStorage.updateBirthday(normalizedBirthday))),
          switchMap(() => userId
            ? from(this.syncCoordinator.queueChange('birthday', normalizedBirthday.id, 'update', normalizedBirthday))
            : of(undefined)
          ),
          map(() => BirthdayActions.updateBirthdaySuccess({ birthday: normalizedBirthday })),
          catchError(error => of(BirthdayActions.updateBirthdayFailure({ error: error.message, id: normalizedBirthday.id })))
        );
      })
    )
  );

  deleteBirthday$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BirthdayActions.deleteBirthday),
      withLatestFrom(this.store.select(AuthSelectors.selectUserId)),
      mergeMap(([{ id }, userId]) =>
        from(this.offlineStorage.getBirthdays()).pipe(
          map(birthdays => birthdays.find(b => b.id === id)),
          tap(() => this.pushNotificationService.cancelAllNotificationsForBirthday(id)),
          switchMap(birthday =>
            birthday?.googleCalendarEventId
              ? from(this.birthdayService.deleteFromGoogleCalendar(birthday.googleCalendarEventId))
              : of(undefined)
          ),
          switchMap(() => from(this.offlineStorage.deleteBirthday(id))),
          switchMap(() => userId
            ? from(this.syncCoordinator.queueChange('birthday', id, 'delete', { id }))
            : of(undefined)
          ),
          map(() => BirthdayActions.deleteBirthdaySuccess({ id })),
          catchError(error => of(BirthdayActions.deleteBirthdayFailure({ error: error.message, id })))
        )
      )
    )
  );

  clearAllBirthdays$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BirthdayActions.clearAllBirthdays),
      switchMap(() =>
        from(this.offlineStorage.clear()).pipe(
          map(() => BirthdayActions.clearAllBirthdaysSuccess()),
          catchError(error => of(BirthdayActions.clearAllBirthdaysFailure({ error: error.message })))
        )
      )
    )
  );

  importBirthdays$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BirthdayActions.importBirthdays),
      withLatestFrom(this.store.select(AuthSelectors.selectUserId)),
      mergeMap(([{ birthdays }, userId]) => {
        const prepared: Birthday[] = birthdays.map(b =>
          this.birthdayService.prepareBirthdayForCreate(b, userId)
        );

        return from(this.offlineStorage.addBirthdays(prepared)).pipe(
          switchMap(() => userId
            ? forkJoin(prepared.map(b =>
                from(this.syncCoordinator.queueChange('birthday', b.id, 'create', b))
              ))
            : of(null)
          ),
          map(() => BirthdayActions.importBirthdaysSuccess({ birthdays: prepared })),
          catchError(error => of(BirthdayActions.importBirthdaysFailure({ error: error.message })))
        );
      })
    )
  );

  loadTestData$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BirthdayActions.loadTestData),
      switchMap(() =>
        from(import('../../../testing').then(m => m.generateMockBirthdays)).pipe(
          switchMap(generateMockBirthdays => {
            const testBirthdays = generateMockBirthdays(() => this.birthdayService.generateId());
            const processedBirthdays: Birthday[] = this.birthdayService.processTestBirthdays(testBirthdays);
            return from(this.offlineStorage.saveBirthdays(processedBirthdays)).pipe(
              map(() => BirthdayActions.loadTestDataSuccess({ birthdays: processedBirthdays }))
            );
          }),
          catchError(error => of(BirthdayActions.loadTestDataFailure({ error: error.message })))
        )
      )
    )
  );
}
