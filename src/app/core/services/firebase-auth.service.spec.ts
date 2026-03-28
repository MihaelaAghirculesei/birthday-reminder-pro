import { TestBed } from '@angular/core/testing';
import {
  FirebaseAuthService,
  isFirebaseAuthError,
  mapFirebaseSignInError,
  FIREBASE_AUTH_CODES,
} from './firebase-auth.service';
import { LoggerService } from './logger.service';
import { provideTranslateTesting } from '../../testing/translate-testing';
import { FIREBASE_OPTIONS } from '../../firebase.config';

const AUTH_HINT_COOKIE = '__Secure-fb_auth_hint';

/** Reads the auth-hint cookie from document.cookie. */
function getAuthHintCookie(): string | undefined {
  return document.cookie
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith(`${AUTH_HINT_COOKIE}=`));
}

/** Clears the auth-hint cookie so each test starts clean. */
function clearAuthHintCookie(): void {
  document.cookie = `${AUTH_HINT_COOKIE}=; Secure; SameSite=Strict; Max-Age=0; Path=/`;
}

/** Injects the auth-hint cookie as if the user had previously signed in. */
function injectAuthHintCookie(): void {
  document.cookie = `${AUTH_HINT_COOKIE}=1; Secure; SameSite=Strict; Max-Age=86400; Path=/`;
}

describe('FirebaseAuthService', () => {
  let service: FirebaseAuthService;
  let loggerMock: jasmine.SpyObj<LoggerService>;

  beforeEach(() => {
    clearAuthHintCookie();

    loggerMock = jasmine.createSpyObj('LoggerService', ['log', 'info', 'warn', 'error']);

    TestBed.configureTestingModule({
      providers: [
        { provide: LoggerService, useValue: loggerMock },
        { provide: FIREBASE_OPTIONS, useValue: undefined },
        provideTranslateTesting()
      ]
    });

    service = TestBed.inject(FirebaseAuthService);
  });

  afterEach(() => {
    clearAuthHintCookie();
  });

  // ── baseline ────────────────────────────────────────────────────────────────

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should initially have null user', () => {
    expect(service.currentUser).toBeNull();
  });

  it('should initially not be authenticated', () => {
    expect(service.isAuthenticated).toBeFalse();
  });

  it('should emit null from user$', (done) => {
    service.user$.subscribe((user) => {
      expect(user).toBeNull();
      done();
    });
  });

  it('should emit true from loading$ initially', (done) => {
    service.loading$.subscribe((loading) => {
      expect(loading).toBeTrue();
      done();
    });
  });

  it('should clean up on destroy', () => {
    service.destroy();
    expect(service).toBeTruthy();
  });

  it('user$ should be an observable', () => {
    expect(service.user$).toBeTruthy();
    expect(service.user$.subscribe).toBeDefined();
  });

  it('loading$ should be an observable', () => {
    expect(service.loading$).toBeTruthy();
    expect(service.loading$.subscribe).toBeDefined();
  });

  // ── auth-hint cookie: initAuthListener without Firebase configured ─────────

  describe('initAuthListener (Firebase not configured)', () => {
    it('resolves loading immediately when no hint cookie is present', (done) => {
      service.initAuthListener();

      // loading$ should emit false after init (Firebase not configured → fast path)
      service.loading$.subscribe((loading) => {
        if (!loading) {
          expect(loading).toBeFalse();
          done();
        }
      });
    });

    it('resolves loading immediately even when hint cookie is present', (done) => {
      // Firebase not configured → isFirebaseConfigured() returns false →
      // initAuthListener() exits early before reading the cookie.
      injectAuthHintCookie();
      service.initAuthListener();

      service.loading$.subscribe((loading) => {
        if (!loading) {
          expect(loading).toBeFalse();
          done();
        }
      });
    });
  });

  // ── auth-hint cookie: helpers work correctly in the test environment ───────

  describe('auth-hint cookie helpers', () => {
    it('starts with no hint cookie', () => {
      expect(getAuthHintCookie()).toBeUndefined();
    });

    it('injectAuthHintCookie sets the cookie', () => {
      injectAuthHintCookie();
      expect(getAuthHintCookie()).toBeDefined();
      expect(getAuthHintCookie()).toContain('1');
    });

    it('clearAuthHintCookie removes the cookie', () => {
      injectAuthHintCookie();
      clearAuthHintCookie();
      expect(getAuthHintCookie()).toBeUndefined();
    });

    it('afterEach clears the cookie between tests', () => {
      // This test verifies isolation: the cookie injected in the previous test
      // must be gone here because clearAuthHintCookie() runs in afterEach.
      expect(getAuthHintCookie()).toBeUndefined();
    });
  });

  // ── signOut observable ────────────────────────────────────────────────────

  describe('signOut (Firebase not configured)', () => {
    it('returns a completing observable', (done) => {
      service.signOut().subscribe({
        complete: () => {
          expect().nothing();
          done();
        }
      });
    });
  });

  // ── signInWithGoogle observable ───────────────────────────────────────────

  describe('signInWithGoogle (Firebase not configured)', () => {
    it('returns an observable that errors with a configuration message', (done) => {
      service.signInWithGoogle().subscribe({
        error: (err: Error) => {
          expect(err.message).toContain('Firebase not configured');
          done();
        }
      });
    });
  });

  // ── isFirebaseAuthError type guard ────────────────────────────────────────

  describe('isFirebaseAuthError', () => {
    it('returns true for a well-formed FirebaseError', () => {
      const err = { name: 'FirebaseError', code: 'auth/popup-blocked', message: 'Popup blocked' };
      expect(isFirebaseAuthError(err)).toBeTrue();
    });

    it('returns true for an unknown code (open extension)', () => {
      const err = { name: 'FirebaseError', code: 'auth/future-code', message: 'Future error' };
      expect(isFirebaseAuthError(err)).toBeTrue();
    });

    it('returns false for a plain Error', () => {
      expect(isFirebaseAuthError(new Error('oops'))).toBeFalse();
    });

    it('returns false when name is not FirebaseError', () => {
      const err = { name: 'OtherError', code: 'auth/popup-blocked', message: 'msg' };
      expect(isFirebaseAuthError(err)).toBeFalse();
    });

    it('returns false when code is missing', () => {
      const err = { name: 'FirebaseError', message: 'no code' };
      expect(isFirebaseAuthError(err)).toBeFalse();
    });

    it('returns false when message is missing', () => {
      const err = { name: 'FirebaseError', code: 'auth/popup-blocked' };
      expect(isFirebaseAuthError(err)).toBeFalse();
    });

    it('returns false for null', () => {
      expect(isFirebaseAuthError(null)).toBeFalse();
    });

    it('returns false for a primitive', () => {
      expect(isFirebaseAuthError('string error')).toBeFalse();
      expect(isFirebaseAuthError(42)).toBeFalse();
    });
  });

  // ── FIREBASE_AUTH_CODES shape ─────────────────────────────────────────────

  describe('FIREBASE_AUTH_CODES', () => {
    it('POPUP_CLOSED maps to auth/popup-closed-by-user', () => {
      expect(FIREBASE_AUTH_CODES.POPUP_CLOSED).toBe('auth/popup-closed-by-user');
    });

    it('POPUP_BLOCKED maps to auth/popup-blocked', () => {
      expect(FIREBASE_AUTH_CODES.POPUP_BLOCKED).toBe('auth/popup-blocked');
    });

    it('CANCELLED maps to auth/cancelled-popup-request', () => {
      expect(FIREBASE_AUTH_CODES.CANCELLED).toBe('auth/cancelled-popup-request');
    });

    it('NETWORK_ERROR maps to auth/network-request-failed', () => {
      expect(FIREBASE_AUTH_CODES.NETWORK_ERROR).toBe('auth/network-request-failed');
    });

    it('TOO_MANY_REQS maps to auth/too-many-requests', () => {
      expect(FIREBASE_AUTH_CODES.TOO_MANY_REQS).toBe('auth/too-many-requests');
    });

    it('USER_DISABLED maps to auth/user-disabled', () => {
      expect(FIREBASE_AUTH_CODES.USER_DISABLED).toBe('auth/user-disabled');
    });
  });

  // ── mapFirebaseSignInError — popup error mapping ──────────────────────────

  describe('mapFirebaseSignInError', () => {
    it('maps auth/popup-closed-by-user to "Sign-in cancelled"', () => {
      const err = { name: 'FirebaseError' as const, code: 'auth/popup-closed-by-user', message: 'popup closed' };
      expect(mapFirebaseSignInError(err).message).toBe('Sign-in cancelled');
    });

    it('maps auth/popup-blocked to human-readable message', () => {
      const err = { name: 'FirebaseError' as const, code: 'auth/popup-blocked', message: 'popup blocked' };
      expect(mapFirebaseSignInError(err).message).toBe('Popup blocked by browser. Please allow popups for this site.');
    });

    it('maps auth/cancelled-popup-request to the Firebase message', () => {
      const err = { name: 'FirebaseError' as const, code: 'auth/cancelled-popup-request', message: 'already pending' };
      expect(mapFirebaseSignInError(err).message).toBe('already pending');
    });

    it('uses "Sign-in failed" fallback when message is empty', () => {
      const err = { name: 'FirebaseError' as const, code: 'auth/unknown', message: '' };
      expect(mapFirebaseSignInError(err).message).toBe('Sign-in failed');
    });

    it('returns an Error instance', () => {
      const err = { name: 'FirebaseError' as const, code: 'auth/popup-blocked', message: 'blocked' };
      expect(mapFirebaseSignInError(err)).toBeInstanceOf(Error);
    });

    it('passes through the message for auth/network-request-failed', () => {
      const err = { name: 'FirebaseError' as const, code: 'auth/network-request-failed', message: 'network error' };
      expect(mapFirebaseSignInError(err).message).toBe('network error');
    });

    it('passes through the message for auth/too-many-requests', () => {
      const err = { name: 'FirebaseError' as const, code: 'auth/too-many-requests', message: 'too many requests' };
      expect(mapFirebaseSignInError(err).message).toBe('too many requests');
    });

    it('passes through the message for auth/user-disabled', () => {
      const err = { name: 'FirebaseError' as const, code: 'auth/user-disabled', message: 'user disabled' };
      expect(mapFirebaseSignInError(err).message).toBe('user disabled');
    });
  });

  // ── performGoogleSignInDirect (Firebase not configured) ───────────────────

  describe('performGoogleSignInDirect (Firebase not configured)', () => {
    it('rejects with "Firebase not configured"', async () => {
      await expectAsync(service.performGoogleSignInDirect())
        .toBeRejectedWithError(/Firebase not configured/);
    });
  });
});

// ── Lazy-loading guarantee: Firebase configured but no auth-hint cookie ───────
//
// When Firebase IS configured and the user is anonymous (no hint cookie),
// initAuthListener() must exit early WITHOUT calling initFirebase().
// The proof: loading$ resolves to false synchronously — initFirebase() is
// async (dynamic import), so it cannot emit false in the same microtask.
// ─────────────────────────────────────────────────────────────────────────────

describe('FirebaseAuthService — lazy-loading guarantee (anonymous session)', () => {
  let service: FirebaseAuthService;
  let loggerMock: jasmine.SpyObj<LoggerService>;

  beforeEach(() => {
    clearAuthHintCookie();

    loggerMock = jasmine.createSpyObj('LoggerService', ['log', 'info', 'warn', 'error']);

    TestBed.configureTestingModule({
      providers: [
        { provide: LoggerService, useValue: loggerMock },
        // Provide real-looking Firebase options so isFirebaseConfigured() returns true.
        // The anonymous fast-path must be taken regardless.
        { provide: FIREBASE_OPTIONS, useValue: { apiKey: 'test-api-key', projectId: 'test-project' } },
        provideTranslateTesting(),
      ],
    });

    service = TestBed.inject(FirebaseAuthService);
  });

  afterEach(() => clearAuthHintCookie());

  it('resolves loading$ synchronously — initFirebase() was never awaited', () => {
    const emissions: boolean[] = [];
    service.loading$.subscribe(v => emissions.push(v));

    service.initAuthListener();

    // BehaviorSubject starts at true, then the no-hint branch emits false in the
    // same synchronous call. initFirebase() is async and cannot produce this
    // emission in the same tick → synchronous [true, false] proves it was skipped.
    expect(emissions).toEqual([true, false]);
  });

  it('leaves user unauthenticated after initAuthListener()', () => {
    service.initAuthListener();

    expect(service.isAuthenticated).toBeFalse();
    expect(service.currentUser).toBeNull();
  });
});
