import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { type Action } from '@ngrx/store';
import { provideMockStore } from '@ngrx/store/testing';
import { EMPTY, Observable, of, Subject, throwError } from 'rxjs';

import { provideTranslateTesting } from '../../../testing/translate-testing';
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
  let authServiceMock: jasmine.SpyObj<FirebaseAuthService>;
  let notificationServiceMock: jasmine.SpyObj<NotificationService>;
  let orphanCleanupMock: jasmine.SpyObj<OrphanPhotoCleanupService>;
  let firestoreMock: jasmine.SpyObj<FirestoreService>;
  let loggerMock: jasmine.SpyObj<LoggerService>;

  const mockUser: AuthUser = {
    uid: 'user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: 'https://example.com/photo.jpg'
  };

  beforeEach(() => {
    authServiceMock = jasmine.createSpyObj(
      'FirebaseAuthService',
      ['signInWithGoogle', 'signOut', 'initAuthListener'],
      { user$: of(null), loading$: of(false), redirectSignIn$: EMPTY, redirectError$: EMPTY }
    );
    notificationServiceMock = jasmine.createSpyObj('NotificationService', ['show']);
    orphanCleanupMock = jasmine.createSpyObj('OrphanPhotoCleanupService', ['cleanupOrphans']);
    orphanCleanupMock.cleanupOrphans.and.resolveTo();
    firestoreMock = jasmine.createSpyObj('FirestoreService', ['migrateCapabilityUrls']);
    firestoreMock.migrateCapabilityUrls.and.resolveTo();
    loggerMock = jasmine.createSpyObj('LoggerService', ['warn', 'info', 'error']);

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
        provideTranslateTesting()
      ]
    });

    effects = TestBed.inject(AuthEffects);
  });

  describe('syncAuthState$', () => {
    it('should dispatch authStateChanged with the user emitted by user$', (done) => {
      effects.syncAuthState$.subscribe(action => {
        expect(action).toEqual(AuthActions.authStateChanged({ user: null }));
        done();
      });
    });
  });

  describe('signInWithGoogle$', () => {
    it('should not dispatch any action (dispatch: false)', (done) => {
      actions$ = of(AuthActions.signInWithGoogle());

      effects.signInWithGoogle$.subscribe((action) => {
        expect(action.type).toBe('[Auth] Sign In With Google');
        done();
      });
    });
  });

  describe('redirectSignIn$', () => {
    it('should dispatch signInSuccess when redirectSignIn$ emits', (done) => {
      const redirectSubject = new Subject<typeof mockUser>();
      (authServiceMock as unknown as { redirectSignIn$: Subject<typeof mockUser> }).redirectSignIn$ = redirectSubject;

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
        done();
      });

      redirectSubject.next(mockUser);
    });
  });

  describe('redirectSignInError$', () => {
    it('should dispatch signInFailure when redirectError$ emits', (done) => {
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
        done();
      });

      errorSubject.next('Sign-in cancelled');
    });
  });

  describe('signInSuccess$', () => {
    it('should show welcome notification', (done) => {
      actions$ = of(AuthActions.signInSuccess({ user: mockUser }));

      effects.signInSuccess$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith(
          'Welcome, Test User!',
          'success'
        );
        done();
      });
    });

    it('should use email if displayName is null', (done) => {
      const userNoName: AuthUser = { ...mockUser, displayName: null };
      actions$ = of(AuthActions.signInSuccess({ user: userNoName }));

      effects.signInSuccess$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith(
          'Welcome, test@example.com!',
          'success'
        );
        done();
      });
    });
  });

  describe('signInFailure$', () => {
    it('should show error notification', (done) => {
      actions$ = of(AuthActions.signInFailure({ error: 'Something went wrong' }));

      effects.signInFailure$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith(
          'Something went wrong',
          'error'
        );
        done();
      });
    });

    it('should show a user-friendly message for cancelled sign-in', (done) => {
      actions$ = of(AuthActions.signInFailure({ error: 'Sign-in cancelled' }));

      effects.signInFailure$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith(
          'Sign-in cancelled — popup was closed before completing',
          'error'
        );
        done();
      });
    });
  });

  describe('signOut$', () => {
    it('should dispatch signOutSuccess on successful sign out', (done) => {
      authServiceMock.signOut.and.returnValue(of(undefined));
      actions$ = of(AuthActions.signOut());

      effects.signOut$.subscribe((action) => {
        expect(action).toEqual(AuthActions.signOutSuccess());
        done();
      });
    });

    it('should dispatch signOutFailure on error', (done) => {
      authServiceMock.signOut.and.returnValue(
        throwError(() => new Error('Sign-out failed'))
      );
      actions$ = of(AuthActions.signOut());

      effects.signOut$.subscribe((action) => {
        expect(action).toEqual(AuthActions.signOutFailure({ error: 'Sign-out failed' }));
        done();
      });
    });
  });

  describe('signOutSuccess$', () => {
    it('should show success notification', (done) => {
      actions$ = of(AuthActions.signOutSuccess());

      effects.signOutSuccess$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith(
          'Signed out successfully',
          'success'
        );
        done();
      });
    });
  });

  describe('signOutFailure$', () => {
    it('should show error notification', (done) => {
      actions$ = of(AuthActions.signOutFailure({ error: 'Network error' }));

      effects.signOutFailure$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith(
          'Sign out failed: Network error',
          'error'
        );
        done();
      });
    });
  });

  describe('scheduleOrphanCleanup$', () => {
    it('should trigger orphan cleanup when auth state changes to a signed-in user', (done) => {
      actions$ = of(AuthActions.authStateChanged({ user: mockUser }));

      effects.scheduleOrphanCleanup$.subscribe(() => {
        expect(orphanCleanupMock.cleanupOrphans).toHaveBeenCalledOnceWith(mockUser.uid);
        done();
      });
    });

    it('should not trigger cleanup when auth state changes to null (signed out)', () => {
      actions$ = of(AuthActions.authStateChanged({ user: null }));

      effects.scheduleOrphanCleanup$.subscribe(() => {
        fail('should not emit for a null user');
      });

      expect(orphanCleanupMock.cleanupOrphans).not.toHaveBeenCalled();
    });
  });

  describe('schedulePhotoMigration$', () => {
    it('should trigger photo URL migration when auth state changes to a signed-in user', (done) => {
      actions$ = of(AuthActions.authStateChanged({ user: mockUser }));

      effects.schedulePhotoMigration$.subscribe(() => {
        expect(firestoreMock.migrateCapabilityUrls).toHaveBeenCalledOnceWith(mockUser.uid);
        done();
      });
    });

    it('should not trigger migration when auth state changes to null (signed out)', () => {
      actions$ = of(AuthActions.authStateChanged({ user: null }));

      effects.schedulePhotoMigration$.subscribe(() => {
        fail('should not emit for a null user');
      });

      expect(firestoreMock.migrateCapabilityUrls).not.toHaveBeenCalled();
    });

    it('should log and recover when migrateCapabilityUrls rejects', (done) => {
      firestoreMock.migrateCapabilityUrls.and.rejectWith(new Error('network'));
      actions$ = of(AuthActions.authStateChanged({ user: mockUser }));

      effects.schedulePhotoMigration$.subscribe({
        complete: () => {
          expect(loggerMock.warn).toHaveBeenCalledWith(
            '[AuthEffects] Photo URL migration error:',
            jasmine.any(Error)
          );
          done();
        }
      });
    });
  });
});

describe('AuthEffects - syncAuthState$ error recovery', () => {
  let errorEffects: AuthEffects;
  let errorLoggerMock: jasmine.SpyObj<LoggerService>;

  beforeEach(() => {
    errorLoggerMock = jasmine.createSpyObj('LoggerService', ['warn', 'info', 'error']);

    const errorAuthServiceMock = jasmine.createSpyObj(
      'FirebaseAuthService',
      ['signInWithGoogle', 'signOut', 'initAuthListener'],
      { user$: throwError(() => new Error('Firebase connection error')), loading$: of(false), redirectSignIn$: EMPTY, redirectError$: EMPTY }
    );

    TestBed.configureTestingModule({
      providers: [
        AuthEffects,
        provideMockActions(() => new Observable<Action>()),
        provideMockStore(),
        { provide: FirebaseAuthService, useValue: errorAuthServiceMock },
        { provide: NotificationService, useValue: jasmine.createSpyObj('NotificationService', ['show']) },
        { provide: OrphanPhotoCleanupService, useValue: { cleanupOrphans: () => Promise.resolve() } },
        { provide: FirestoreService, useValue: { migrateCapabilityUrls: () => Promise.resolve() } },
        { provide: LoggerService, useValue: errorLoggerMock },
        provideTranslateTesting()
      ]
    });

    errorEffects = TestBed.inject(AuthEffects);
  });

  it('should dispatch authStateChanged({ user: null }) and log when user$ errors', (done) => {
    errorEffects.syncAuthState$.subscribe(action => {
      expect(action).toEqual(AuthActions.authStateChanged({ user: null }));
      expect(errorLoggerMock.error).toHaveBeenCalled();
      done();
    });
  });
});