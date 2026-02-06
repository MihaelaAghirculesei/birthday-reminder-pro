import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, exhaustMap, catchError, tap } from 'rxjs/operators';
import { FirebaseAuthService } from '../../services/firebase-auth.service';
import { NotificationService } from '../../services/notification.service';
import * as AuthActions from './auth.actions';

@Injectable()
export class AuthEffects {
  private readonly actions$ = inject(Actions);
  private readonly authService = inject(FirebaseAuthService);
  private readonly notificationService = inject(NotificationService);

  signInWithGoogle$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.signInWithGoogle),
      exhaustMap(() =>
        this.authService.signInWithGoogle().pipe(
          map((user) => AuthActions.signInSuccess({ user })),
          catchError((error) =>
            of(AuthActions.signInFailure({ error: error.message }))
          )
        )
      )
    )
  );

  signInSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.signInSuccess),
        tap(({ user }) => {
          this.notificationService.show(
            `Welcome, ${user.displayName || user.email}!`,
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
          this.notificationService.show('Signed out successfully', 'success');
        })
      ),
    { dispatch: false }
  );

  signOutFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.signOutFailure),
        tap(({ error }) => {
          this.notificationService.show(`Sign out failed: ${error}`, 'error');
        })
      ),
    { dispatch: false }
  );
}
