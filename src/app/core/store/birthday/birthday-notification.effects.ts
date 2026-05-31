import { inject, Injectable } from '@angular/core';

import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';

import { TranslateService } from '@ngx-translate/core';
import { tap } from 'rxjs/operators';

import { NotificationService } from '../../services/notification.service';
import * as BirthdayActions from './birthday.actions';

@Injectable()
export class BirthdayNotificationEffects {

  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
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
        tap(({ birthday }) => {
          this.notificationService.show(
            this.translate.instant('NOTIFICATIONS.BIRTHDAY_DELETED'),
            'success',
            5000,
            {
              label: this.translate.instant('BIRTHDAY_LIST.UNDO'),
              callback: () => this.store.dispatch(BirthdayActions.addBirthday({ birthday }))
            }
          );
        })
      ),
    { dispatch: false }
  );

  addBirthdayFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(BirthdayActions.addBirthdayFailure),
        tap(({ error, birthday }) => {
          this.notificationService.show(
            this.translate.instant('NOTIFICATIONS.FAILED_ADD_BIRTHDAY', { error }),
            'error',
            undefined,
            birthday ? {
              label: this.translate.instant('NOTIFICATIONS.RETRY'),
              callback: () => this.store.dispatch(BirthdayActions.addBirthday({ birthday }))
            } : undefined
          );
        })
      ),
    { dispatch: false }
  );

  updateBirthdayFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(BirthdayActions.updateBirthdayFailure),
        tap(({ error, birthday }) => {
          this.notificationService.show(
            this.translate.instant('NOTIFICATIONS.FAILED_UPDATE_BIRTHDAY', { error }),
            'error',
            undefined,
            birthday ? {
              label: this.translate.instant('NOTIFICATIONS.RETRY'),
              callback: () => this.store.dispatch(BirthdayActions.updateBirthday({ birthday, operationId: crypto.randomUUID() }))
            } : undefined
          );
        })
      ),
    { dispatch: false }
  );

  deleteBirthdayFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(BirthdayActions.deleteBirthdayFailure),
        tap(({ error, id }) => {
          this.notificationService.show(
            this.translate.instant('NOTIFICATIONS.FAILED_DELETE_BIRTHDAY', { error }),
            'error',
            undefined,
            id ? {
              label: this.translate.instant('NOTIFICATIONS.RETRY'),
              callback: () => this.store.dispatch(BirthdayActions.deleteBirthday({ id }))
            } : undefined
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

  loadBirthdaysFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(BirthdayActions.loadBirthdaysFailure),
        tap(() => {
          this.notificationService.show(
            this.translate.instant('NOTIFICATIONS.FAILED_LOAD_BIRTHDAYS'),
            'error',
            undefined,
            {
              label: this.translate.instant('NOTIFICATIONS.RETRY'),
              callback: () => this.store.dispatch(BirthdayActions.loadBirthdays())
            }
          );
        })
      ),
    { dispatch: false }
  );

  clearAllBirthdaysFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(BirthdayActions.clearAllBirthdaysFailure),
        tap(() => {
          this.notificationService.show(
            this.translate.instant('NOTIFICATIONS.FAILED_CLEAR'),
            'error',
            undefined,
            {
              label: this.translate.instant('NOTIFICATIONS.RETRY'),
              callback: () => this.store.dispatch(BirthdayActions.clearAllBirthdays())
            }
          );
        })
      ),
    { dispatch: false }
  );

  loadTestDataFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(BirthdayActions.loadTestDataFailure),
        tap(() => {
          this.notificationService.show(
            this.translate.instant('NOTIFICATIONS.FAILED_LOAD_TEST_DATA'),
            'error',
            undefined,
            {
              label: this.translate.instant('NOTIFICATIONS.RETRY'),
              callback: () => this.store.dispatch(BirthdayActions.loadTestData())
            }
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
