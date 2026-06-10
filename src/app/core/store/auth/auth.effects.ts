import { inject,Injectable } from '@angular/core';

import { Actions, createEffect, ofType } from '@ngrx/effects';

import { TranslateService } from '@ngx-translate/core';
import { EMPTY, from, of } from 'rxjs';
import { catchError, exhaustMap, filter, map, switchMap, take, tap } from 'rxjs/operators';

import { AccountDeletionService } from '../../services/account-deletion.service';
import { FirebaseAuthService } from '../../services/firebase-auth.service';
import { FirestoreService } from '../../services/firestore.service';
import { LoggerService } from '../../services/logger.service';
import { NotificationService } from '../../services/notification.service';
import { OrphanPhotoCleanupService } from '../../services/orphan-photo-cleanup.service';
import * as AuthActions from './auth.actions';

@Injectable()
export class AuthEffects {
  private readonly actions$ = inject(Actions);
  private readonly authService = inject(FirebaseAuthService);
  private readonly accountDeletion = inject(AccountDeletionService);
  private readonly notificationService = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly orphanCleanup = inject(OrphanPhotoCleanupService);
  private readonly firestoreService = inject(FirestoreService);
  private readonly logger = inject(LoggerService);

  /**
   * Dispatches authInitialized once when the Firebase auth service signals that
   * the initial auth check is done (loading$ → false).
   *
   * Anonymous fast-path: loading$ becomes false immediately inside APP_INITIALIZER
   * (no Firebase SDK loaded). Returning users: becomes false after onAuthStateChanged
   * fires and user$ has already emitted the restored session.
   *
   * The auth guard blocks on selectAuthInitialized so this is the gate that lets it
   * proceed without an infinite wait.
   */
  initializeAuth$ = createEffect(() =>
    this.authService.loading$.pipe(
      filter(loading => !loading),
      take(1),
      map(() => AuthActions.authInitialized())
    )
  );

  /** Bridge Firebase auth state (including session restoration on reload) to the NgRx store. */
  syncAuthState$ = createEffect(() =>
    this.authService.user$.pipe(
      map(user => AuthActions.authStateChanged({ user })),
      catchError((err) => {
        this.logger.error('[AuthEffects] Auth state observer error — treating as signed-out:', err);
        return of(AuthActions.authStateChanged({ user: null }));
      })
    )
  );

  signInWithGoogle$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.signInWithGoogle),
        tap(() => {
          // Sign-in is triggered directly from components to avoid popup blocking.
          // This effect only handles loading state; the actual result comes via
          // redirectSignIn$ (redirect flow) or component dispatch (GIS flow).
        })
      ),
    { dispatch: false }
  );

  /** Dispatch signInSuccess after a successful signInWithRedirect round-trip. */
  redirectSignIn$ = createEffect(() =>
    this.authService.redirectSignIn$.pipe(
      map(user => AuthActions.signInSuccess({ user }))
    )
  );

  /** Dispatch signInFailure if the redirect sign-in was cancelled or errored. */
  redirectSignInError$ = createEffect(() =>
    this.authService.redirectError$.pipe(
      map(error => AuthActions.signInFailure({ error }))
    )
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
          this.notificationService.show(
            error === 'Sign-in cancelled' ? 'Sign-in cancelled — popup was closed before completing' : error,
            'error'
          );
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

  deleteAccount$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.deleteAccount),
      exhaustMap(({ userId }) =>
        this.accountDeletion.deleteAccount(userId).pipe(
          map(() => AuthActions.deleteAccountSuccess()),
          catchError((error: unknown) => {
            const message = error instanceof Error ? error.message : String(error);
            return of(AuthActions.deleteAccountFailure({ error: message }));
          })
        )
      )
    )
  );

  deleteAccountSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.deleteAccountSuccess),
        tap(() => {
          this.notificationService.show(
            this.translate.instant('NOTIFICATIONS.ACCOUNT_DELETED'),
            'success'
          );
        })
      ),
    { dispatch: false }
  );

  deleteAccountFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.deleteAccountFailure),
        tap(({ error }) => {
          const key = error.includes('requires-recent-login')
            ? 'NOTIFICATIONS.DELETE_ACCOUNT_REAUTH'
            : 'NOTIFICATIONS.DELETE_ACCOUNT_FAILED';
          this.notificationService.show(
            this.translate.instant(key, { error }),
            'error'
          );
        })
      ),
    { dispatch: false }
  );

  /**
   * Triggers the orphan-photo cleanup job whenever auth state settles with a
   * signed-in user. Throttled internally to at most once per 24 h.
   * Errors are logged and swallowed via catchError so the outer stream survives.
   */
  scheduleOrphanCleanup$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.authStateChanged),
        filter(({ user }) => user !== null),
        switchMap(({ user }) =>
          from(this.orphanCleanup.cleanupOrphans(user!.uid)).pipe(
            catchError(err => {
              this.logger.warn('[AuthEffects] Orphan photo cleanup error:', err);
              return EMPTY;
            })
          )
        )
      ),
    { dispatch: false }
  );

  /**
   * Migrates Firestore birthday documents that still store capability URLs
   * (with ?token=...) to plain Storage paths on every sign-in.
   * Becomes a silent no-op once all documents are migrated.
   */
  schedulePhotoMigration$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.authStateChanged),
        filter(({ user }) => user !== null),
        switchMap(({ user }) =>
          from(this.firestoreService.migrateCapabilityUrls(user!.uid)).pipe(
            catchError(err => {
              this.logger.warn('[AuthEffects] Photo URL migration error:', err);
              return EMPTY;
            })
          )
        )
      ),
    { dispatch: false }
  );
}