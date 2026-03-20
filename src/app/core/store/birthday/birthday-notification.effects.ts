import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { tap } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import * as BirthdayActions from './birthday.actions';
import { NotificationService } from '../../services/notification.service';

@Injectable()
export class BirthdayNotificationEffects {

  private readonly actions$ = inject(Actions);
  private readonly notificationService = inject(NotificationService);
  private readonly translate = inject(TranslateService);

  addBirthdaySuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(BirthdayActions.addBirthdaySuccess),
        tap(({ birthday }) => {
          this.notificationService.show(
            this.translate.instant('NOTIFICATIONS.BIRTHDAY_ADDED', { name: birthday.name }),
            'success'
          );
        })
      ),
    { dispatch: false }
  );

  updateBirthdaySuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(BirthdayActions.updateBirthdaySuccess),
        tap(({ birthday }) => {
          this.notificationService.show(
            this.translate.instant('NOTIFICATIONS.BIRTHDAY_UPDATED', { name: birthday.name }),
            'success'
          );
        })
      ),
    { dispatch: false }
  );

  deleteBirthdaySuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(BirthdayActions.deleteBirthdaySuccess),
        tap(() => {
          this.notificationService.show(
            this.translate.instant('NOTIFICATIONS.BIRTHDAY_DELETED'),
            'success'
          );
        })
      ),
    { dispatch: false }
  );

  addMessageToBirthdayFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(BirthdayActions.addMessageToBirthdayFailure),
        tap(({ error }) => {
          this.notificationService.show(
            this.translate.instant('NOTIFICATIONS.FAILED_ADD_MESSAGE', { error }),
            'error'
          );
        })
      ),
    { dispatch: false }
  );

  updateMessageInBirthdayFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(BirthdayActions.updateMessageInBirthdayFailure),
        tap(({ error }) => {
          this.notificationService.show(
            this.translate.instant('NOTIFICATIONS.FAILED_UPDATE_MESSAGE', { error }),
            'error'
          );
        })
      ),
    { dispatch: false }
  );

  deleteMessageFromBirthdayFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(BirthdayActions.deleteMessageFromBirthdayFailure),
        tap(({ error }) => {
          this.notificationService.show(
            this.translate.instant('NOTIFICATIONS.FAILED_DELETE_MESSAGE', { error }),
            'error'
          );
        })
      ),
    { dispatch: false }
  );

  loadTestDataSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(BirthdayActions.loadTestDataSuccess),
        tap(({ birthdays }) => {
          this.notificationService.show(
            this.translate.instant('IMPORT_EXPORT.IMPORTED', { count: birthdays.length }),
            'success'
          );
        })
      ),
    { dispatch: false }
  );
}
