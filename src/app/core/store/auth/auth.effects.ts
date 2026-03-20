import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, exhaustMap, catchError, tap } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { FirebaseAuthService } from '../../services/firebase-auth.service';
import { NotificationService } from '../../services/notification.service';
import * as AuthActions from './auth.actions';

@Injectable()
export class AuthEffects {
  private readonly actions$ = inject(Actions);
  private readonly authService = inject(FirebaseAuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly translate = inject(TranslateService);

  signInWithGoogle$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.signInWithGoogle),
        tap(() => {
          // Sign-in popup is triggered directly from AuthButtonComponent
          // to avoid browser popup blocking. This effect only handles loading state.
        })
      ),
    { dispatch: false }
  );

  signInSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.signInSuccess),
        tap(({ user }) => {
          this.notificationService.show(
            this.translate.instant('NOTIFICATIONS.WELCOME', { name: user.displayName || user.email }),
            'success'
          );
        })
      ),
    { dispatch: false }
  );

  signInFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.signInFailure),
        tap(({ error }) => {
          if (error !== 'Sign-in cancelled') {
            this.notificationService.show(error, 'error');
          }
        })
      ),
    { dispatch: false }
  );

  signOut$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.signOut),
      exhaustMap(() =>
        this.authService.signOut().pipe(
          map(() => AuthActions.signOutSuccess()),
          catchError((error) =>
            of(AuthActions.signOutFailure({ error: error.message }))
          )
        )
      )
    )
  );

  signOutSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.signOutSuccess),
        tap(() => {
          this.notificationService.show(this.translate.instant('NOTIFICATIONS.SIGNED_OUT'), 'success');
        })
      ),
    { dispatch: false }
  );

  signOutFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.signOutFailure),
        tap(({ error }) => {
          this.notificationService.show(
            this.translate.instant('NOTIFICATIONS.SIGN_OUT_FAILED', { error }),
            'error'
          );
        })
      ),
    { dispatch: false }
  );
}
