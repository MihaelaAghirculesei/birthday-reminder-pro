import { TestBed } from '@angular/core/testing';
import { FirebaseAuthService } from './firebase-auth.service';
import { LoggerService } from './logger.service';
import { provideTranslateTesting } from '../../testing/translate-testing';
import { environment } from '../../../environments/environment';

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
  const originalFirebase = environment.firebase;

  beforeEach(() => {
    // Force isFirebaseConfigured() to return false — no real Firebase calls.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (environment as any).firebase = undefined;

    clearAuthHintCookie();

    loggerMock = jasmine.createSpyObj('LoggerService', ['log', 'info', 'warn', 'error']);

    TestBed.configureTestingModule({
      providers: [
        { provide: LoggerService, useValue: loggerMock },
        provideTranslateTesting()
      ]
    });

    service = TestBed.inject(FirebaseAuthService);
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (environment as any).firebase = originalFirebase;
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
        complete: () => done()
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
});
