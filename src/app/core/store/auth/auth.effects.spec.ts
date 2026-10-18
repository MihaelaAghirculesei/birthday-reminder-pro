import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { type Action } from '@ngrx/store';
import { provideMockStore } from '@ngrx/store/testing';
import { EMPTY, Observable, of, Subject, throwError } from 'rxjs';
import type { MockedObject } from 'vitest';

import { provideTranslateTesting } from '../../../testing/translate-testing';
import { AccountDeletionService } from '../../services/account-deletion.service';
import { type AuthUser, FirebaseAuthService } from '../../services/firebase-auth.service';
import { FirestoreService } from '../../services/firestore.service';
import { LoggerService } from '../../services/logger.service';
import { NotificationService } from '../../services/notification.service';
import { OrphanPhotoCleanupService } from '../../services/orphan-photo-cleanup.service';
import * as AuthActions from './auth.actions';
import { AuthEffects } from './auth.effects';

describe('AuthEffects', () => {
  let actions$: Observable<Action>;
  let effects: AuthEffects;
  let authServiceMock: MockedObject<FirebaseAuthService>;
  let notificationServiceMock: MockedObject<NotificationService>;
  let orphanCleanupMock: MockedObject<OrphanPhotoCleanupService>;
  let firestoreMock: MockedObject<FirestoreService>;
  let loggerMock: MockedObject<LoggerService>;
  let accountDeletionMock: MockedObject<AccountDeletionService>;

  const mockUser: AuthUser = {
    uid: 'user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: 'https://example.com/photo.jpg'
  };

  beforeEach(() => {
    authServiceMock = {
      signInWithGoogle: vi.fn().mockName('FirebaseAuthService.signInWithGoogle'),
      signOut: vi.fn().mockName('FirebaseAuthService.signOut'),
      initAuthListener: vi.fn().mockName('FirebaseAuthService.initAuthListener'),
      user$: of(null), loading$: of(false), redirectSignIn$: EMPTY, redirectError$: EMPTY
    } as unknown as MockedObject<FirebaseAuthService>;
    notificationServiceMock = {
      show: vi.fn().mockName('NotificationService.show')
    } as unknown as MockedObject<NotificationService>;
    orphanCleanupMock = {
      cleanupOrphans: vi.fn().mockName('OrphanPhotoCleanupService.cleanupOrphans')
    } as unknown as MockedObject<OrphanPhotoCleanupService>;
    orphanCleanupMock.cleanupOrphans.mockResolvedValue(undefined);
    firestoreMock = {
      migrateCapabilityUrls: vi.fn().mockName('FirestoreService.migrateCapabilityUrls')
    } as unknown as MockedObject<FirestoreService>;
    firestoreMock.migrateCapabilityUrls.mockResolvedValue(undefined);
    loggerMock = {
      warn: vi.fn().mockName('LoggerService.warn'),
      info: vi.fn().mockName('LoggerService.info'),
      error: vi.fn().mockName('LoggerService.error')
    } as unknown as MockedObject<LoggerService>;
    accountDeletionMock = {
      deleteAccount: vi.fn().mockName('AccountDeletionService.deleteAccount')
    } as unknown as MockedObject<AccountDeletionService>;
    accountDeletionMock.deleteAccount.mockReturnValue(of(undefined));

    TestBed.configureTestingModule({
      providers: [
        AuthEffects,
        provideMockActions(() => actions$),
        provideMockStore({
          initialState: {
            auth: { user: null, loading: false, error: null, initialized: true }
          }
        }),
        { provide: FirebaseAuthService, useValue: authServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: OrphanPhotoCleanupService, useValue: orphanCleanupMock },
        { provide: FirestoreService, useValue: firestoreMock },
        { provide: LoggerService, useValue: loggerMock },
        { provide: AccountDeletionService, useValue: accountDeletionMock },
        provideTranslateTesting()
      ]
    });

    effects = TestBed.inject(AuthEffects);
  });

  describe('syncAuthState$', () => {
    it('should dispatch authStateChanged with the user emitted by user$', async () => {
      effects.syncAuthState$.subscribe(action => {
        expect(action).toEqual(AuthActions.authStateChanged({ user: null }));
      });
    });
  });

  describe('signInWithGoogle$', () => {
    it('should not dispatch any action (dispatch: false)', async () => {
      actions$ = of(AuthActions.signInWithGoogle());

      effects.signInWithGoogle$.subscribe((action) => {
        expect(action.type).toBe('[Auth] Sign In With Google');
      });
    });
  });

  describe('redirectSignIn$', () => {
    it('should dispatch signInSuccess when redirectSignIn$ emits', async () => {
      const redirectSubject = new Subject<typeof mockUser>();
      (authServiceMock as unknown as {
        redirectSignIn$: Subject<typeof mockUser>;
      }).redirectSignIn$ = redirectSubject;

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          AuthEffects,
          provideMockActions(() => actions$),
          provideMockStore({ initialState: { auth: { user: null, loading: false, error: null, initialized: true } } }),
          { provide: FirebaseAuthService, useValue: { ...authServiceMock, redirectSignIn$: redirectSubject, redirectError$: EMPTY } },
          { provide: NotificationService, useValue: notificationServiceMock },
          { provide: OrphanPhotoCleanupService, useValue: orphanCleanupMock },
          { provide: FirestoreService, useValue: firestoreMock },
          { provide: LoggerService, useValue: loggerMock },
          provideTranslateTesting()
        ]
      });
      const localEffects = TestBed.inject(AuthEffects);

      localEffects.redirectSignIn$.subscribe(action => {
        expect(action).toEqual(AuthActions.signInSuccess({ user: mockUser }));
      });

      redirectSubject.next(mockUser);
    });
  });

  describe('redirectSignInError$', () => {
    it('should dispatch signInFailure when redirectError$ emits', async () => {
      const errorSubject = new Subject<string>();

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          AuthEffects,
          provideMockActions(() => actions$),
          provideMockStore({ initialState: { auth: { user: null, loading: false, error: null, initialized: true } } }),
          { provide: FirebaseAuthService, useValue: { ...authServiceMock, redirectSignIn$: EMPTY, redirectError$: errorSubject } },
          { provide: NotificationService, useValue: notificationServiceMock },
          { provide: OrphanPhotoCleanupService, useValue: orphanCleanupMock },
          { provide: FirestoreService, useValue: firestoreMock },
          { provide: LoggerService, useValue: loggerMock },
          provideTranslateTesting()
        ]
      });
      const localEffects = TestBed.inject(AuthEffects);

      localEffects.redirectSignInError$.subscribe(action => {
        expect(action).toEqual(AuthActions.signInFailure({ error: 'Sign-in cancelled' }));
      });

      errorSubject.next('Sign-in cancelled');
    });
  });

  describe('signInSuccess$', () => {
    it('should show welcome notification', async () => {
      actions$ = of(AuthActions.signInSuccess({ user: mockUser }));

      effects.signInSuccess$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith('Welcome, Test User!', 'success');
      });
    });

    it('should use email if displayName is null', async () => {
      const userNoName: AuthUser = { ...mockUser, displayName: null };
      actions$ = of(AuthActions.signInSuccess({ user: userNoName }));

      effects.signInSuccess$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith('Welcome, test@example.com!', 'success');
      });
    });
  });

  describe('signInFailure$', () => {
    it('should show error notification', async () => {
      actions$ = of(AuthActions.signInFailure({ error: 'Something went wrong' }));

      effects.signInFailure$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith('Something went wrong', 'error');
      });
    });

    it('should show a user-friendly message for cancelled sign-in', async () => {
      actions$ = of(AuthActions.signInFailure({ error: 'Sign-in cancelled' }));

      effects.signInFailure$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith('Sign-in cancelled — popup was closed before completing', 'error');
      });
    });
  });

  describe('signOut$', () => {
    it('should dispatch signOutSuccess on successful sign out', async () => {
      authServiceMock.signOut.mockReturnValue(of(undefined));
      actions$ = of(AuthActions.signOut());

      effects.signOut$.subscribe((action) => {
        expect(action).toEqual(AuthActions.signOutSuccess());
      });
    });

    it('should dispatch signOutFailure on error', async () => {
      authServiceMock.signOut.mockReturnValue(throwError(() => new Error('Sign-out failed')));
      actions$ = of(AuthActions.signOut());

      effects.signOut$.subscribe((action) => {
        expect(action).toEqual(AuthActions.signOutFailure({ error: 'Sign-out failed' }));
      });
    });
  });

  describe('signOutSuccess$', () => {
    it('should show success notification', async () => {
      actions$ = of(AuthActions.signOutSuccess());

      effects.signOutSuccess$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith('Signed out successfully', 'success');
      });
    });
  });

  describe('signOutFailure$', () => {
    it('should show error notification', async () => {
      actions$ = of(AuthActions.signOutFailure({ error: 'Network error' }));

      effects.signOutFailure$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith('Sign out failed: Network error', 'error');
      });
    });
  });

  describe('deleteAccount$', () => {
    it('should dispatch deleteAccountSuccess on successful deletion', async () => {
      accountDeletionMock.deleteAccount.mockReturnValue(of(undefined));
      actions$ = of(AuthActions.deleteAccount({ userId: 'user-123' }));

      effects.deleteAccount$.subscribe(action => {
        expect(action).toEqual(AuthActions.deleteAccountSuccess());
        expect(accountDeletionMock.deleteAccount).toHaveBeenCalledWith('user-123');
      });
    });

    it('should dispatch deleteAccountFailure with error message on Error', async () => {
      accountDeletionMock.deleteAccount.mockReturnValue(throwError(() => new Error('requires-recent-login')));
      actions$ = of(AuthActions.deleteAccount({ userId: 'user-123' }));

      effects.deleteAccount$.subscribe(action => {
        expect(action).toEqual(AuthActions.deleteAccountFailure({ error: 'requires-recent-login' }));
      });
    });

    it('should dispatch deleteAccountFailure with string conversion for non-Error throws', async () => {
      accountDeletionMock.deleteAccount.mockReturnValue(throwError(() => 'unexpected failure'));
      actions$ = of(AuthActions.deleteAccount({ userId: 'user-123' }));

      effects.deleteAccount$.subscribe(action => {
        expect(action).toEqual(AuthActions.deleteAccountFailure({ error: 'unexpected failure' }));
      });
    });
  });

  describe('deleteAccountSuccess$', () => {
    it('should show account-deleted notification', async () => {
      actions$ = of(AuthActions.deleteAccountSuccess());

      effects.deleteAccountSuccess$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith('Account deleted. All your data has been permanently removed.', 'success');
      });
    });
  });

  describe('deleteAccountFailure$', () => {
    it('should show re-auth notification when error includes requires-recent-login', async () => {
      actions$ = of(AuthActions.deleteAccountFailure({ error: 'requires-recent-login' }));

      effects.deleteAccountFailure$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith('For security, please sign out and sign in again before deleting your account.', 'error');
      });
    });

    it('should show generic failure notification for other errors', async () => {
      actions$ = of(AuthActions.deleteAccountFailure({ error: 'network-error' }));

      effects.deleteAccountFailure$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith('Failed to delete account: network-error', 'error');
      });
    });
  });

  describe('scheduleOrphanCleanup$', () => {
    it('should trigger orphan cleanup when auth state changes to a signed-in user', async () => {
      actions$ = of(AuthActions.authStateChanged({ user: mockUser }));

      effects.scheduleOrphanCleanup$.subscribe(() => {
        expect(orphanCleanupMock.cleanupOrphans).toHaveBeenCalledTimes(1);
        expect(orphanCleanupMock.cleanupOrphans).toHaveBeenCalledWith(mockUser.uid);
      });
    });

    it('should not trigger cleanup when auth state changes to null (signed out)', () => {
      actions$ = of(AuthActions.authStateChanged({ user: null }));

      effects.scheduleOrphanCleanup$.subscribe(() => {
        throw new Error('should not emit for a null user');
      });

      expect(orphanCleanupMock.cleanupOrphans).not.toHaveBeenCalled();
    });
  });

  describe('schedulePhotoMigration$', () => {
    it('should trigger photo URL migration when auth state changes to a signed-in user', async () => {
      actions$ = of(AuthActions.authStateChanged({ user: mockUser }));

      effects.schedulePhotoMigration$.subscribe(() => {
        expect(firestoreMock.migrateCapabilityUrls).toHaveBeenCalledTimes(1);
        expect(firestoreMock.migrateCapabilityUrls).toHaveBeenCalledWith(mockUser.uid);
      });
    });

    it('should not trigger migration when auth state changes to null (signed out)', () => {
      actions$ = of(AuthActions.authStateChanged({ user: null }));

      effects.schedulePhotoMigration$.subscribe(() => {
        throw new Error('should not emit for a null user');
      });

      expect(firestoreMock.migrateCapabilityUrls).not.toHaveBeenCalled();
    });

    it('should log and recover when migrateCapabilityUrls rejects', async () => {
      firestoreMock.migrateCapabilityUrls.mockRejectedValue(new Error('network'));
      actions$ = of(AuthActions.authStateChanged({ user: mockUser }));

      effects.schedulePhotoMigration$.subscribe({
        complete: () => {
          expect(loggerMock.warn).toHaveBeenCalledWith('[AuthEffects] Photo URL migration error:', expect.any(Error));
        }
      });
    });
  });
});

describe('AuthEffects - syncAuthState$ error recovery', () => {
  let errorEffects: AuthEffects;
  let errorLoggerMock: MockedObject<LoggerService>;

  beforeEach(() => {
    errorLoggerMock = {
      warn: vi.fn().mockName('LoggerService.warn'),
      info: vi.fn().mockName('LoggerService.info'),
      error: vi.fn().mockName('LoggerService.error')
    } as unknown as MockedObject<LoggerService>;

    const errorAuthServiceMock = {
      signInWithGoogle: vi.fn().mockName('FirebaseAuthService.signInWithGoogle'),
      signOut: vi.fn().mockName('FirebaseAuthService.signOut'),
      initAuthListener: vi.fn().mockName('FirebaseAuthService.initAuthListener'),
      user$: throwError(() => new Error('Firebase connection error')), loading$: of(false), redirectSignIn$: EMPTY, redirectError$: EMPTY
    };

    TestBed.configureTestingModule({
      providers: [
        AuthEffects,
        provideMockActions(() => new Observable<Action>()),
        provideMockStore(),
        { provide: FirebaseAuthService, useValue: errorAuthServiceMock },
        {
          provide: NotificationService, useValue: {
            show: vi.fn().mockName('NotificationService.show')
          }
        },
        { provide: OrphanPhotoCleanupService, useValue: { cleanupOrphans: () => Promise.resolve() } },
        { provide: FirestoreService, useValue: { migrateCapabilityUrls: () => Promise.resolve() } },
        { provide: LoggerService, useValue: errorLoggerMock },
        { provide: AccountDeletionService, useValue: { deleteAccount: () => of(undefined) } },
        provideTranslateTesting()
      ]
    });

    errorEffects = TestBed.inject(AuthEffects);
  });

  it('should dispatch authStateChanged({ user: null }) and log when user$ errors', async () => {
    errorEffects.syncAuthState$.subscribe(action => {
      expect(action).toEqual(AuthActions.authStateChanged({ user: null }));
      expect(errorLoggerMock.error).toHaveBeenCalled();
    });
  });
});
