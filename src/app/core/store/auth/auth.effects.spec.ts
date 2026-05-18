import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Observable, of, throwError } from 'rxjs';
import { Action } from '@ngrx/store';
import { AuthEffects } from './auth.effects';
import * as AuthActions from './auth.actions';
import { provideTranslateTesting } from '../../../testing/translate-testing';
import { FirebaseAuthService, AuthUser } from '../../services/firebase-auth.service';
import { NotificationService } from '../../services/notification.service';
import { LoggerService } from '../../services/logger.service';
import { OrphanPhotoCleanupService } from '../../services/orphan-photo-cleanup.service';

describe('AuthEffects', () => {
  let actions$: Observable<Action>;
  let effects: AuthEffects;
  let authServiceMock: jasmine.SpyObj<FirebaseAuthService>;
  let notificationServiceMock: jasmine.SpyObj<NotificationService>;
  let orphanCleanupMock: jasmine.SpyObj<OrphanPhotoCleanupService>;
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
      { user$: of(null), loading$: of(false) }
    );
    notificationServiceMock = jasmine.createSpyObj('NotificationService', ['show']);
    orphanCleanupMock = jasmine.createSpyObj('OrphanPhotoCleanupService', ['cleanupOrphans']);
    orphanCleanupMock.cleanupOrphans.and.resolveTo();
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

    it('should not show notification for cancelled sign-in', (done) => {
      actions$ = of(AuthActions.signInFailure({ error: 'Sign-in cancelled' }));

      effects.signInFailure$.subscribe(() => {
        expect(notificationServiceMock.show).not.toHaveBeenCalled();
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
});

describe('AuthEffects - syncAuthState$ error recovery', () => {
  let errorEffects: AuthEffects;
  let errorLoggerMock: jasmine.SpyObj<LoggerService>;

  beforeEach(() => {
    errorLoggerMock = jasmine.createSpyObj('LoggerService', ['warn', 'info', 'error']);

    const errorAuthServiceMock = jasmine.createSpyObj(
      'FirebaseAuthService',
      ['signInWithGoogle', 'signOut', 'initAuthListener'],
      { user$: throwError(() => new Error('Firebase connection error')), loading$: of(false) }
    );

    TestBed.configureTestingModule({
      providers: [
        AuthEffects,
        provideMockActions(() => new Observable<Action>()),
        provideMockStore(),
        { provide: FirebaseAuthService, useValue: errorAuthServiceMock },
        { provide: NotificationService, useValue: jasmine.createSpyObj('NotificationService', ['show']) },
        { provide: OrphanPhotoCleanupService, useValue: { cleanupOrphans: () => Promise.resolve() } },
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