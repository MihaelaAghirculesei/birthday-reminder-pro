import { Injectable, inject, PLATFORM_ID, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { Auth, User } from 'firebase/auth';
import { Observable, BehaviorSubject, from } from 'rxjs';
import {
  getFirebaseAuth,
  getFirebaseAuthModule,
  initFirebase,
  checkFirebaseOptions,
  FIREBASE_OPTIONS,
} from '../../firebase.config';
import { environment } from '../../../environments/environment';
import { LoggerService } from './logger.service';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// ── Firebase Auth error types ─────────────────────────────────────────────────

/**
 * Firebase Auth error codes for the Google sign-in popup flow.
 * Typed as const so each value is a string literal, enabling exhaustive
 * narrowing in switch statements.
 */
export const FIREBASE_AUTH_CODES = {
  POPUP_CLOSED:    'auth/popup-closed-by-user',
  POPUP_BLOCKED:   'auth/popup-blocked',
  CANCELLED:       'auth/cancelled-popup-request',
  NETWORK_ERROR:   'auth/network-request-failed',
  TOO_MANY_REQS:   'auth/too-many-requests',
  USER_DISABLED:   'auth/user-disabled',
} as const;

export type FirebaseAuthCode =
  typeof FIREBASE_AUTH_CODES[keyof typeof FIREBASE_AUTH_CODES];

/**
 * Structural mirror of the Firebase SDK `AuthError`, defined locally so the
 * Firebase package is never imported at module scope (keeping it lazy).
 *
 * `name: 'FirebaseError'` is the discriminant — the SDK unconditionally sets
 * this on every error it throws, making it a reliable runtime tag.
 *
 * `code` accepts both the known literal union AND arbitrary strings
 * (`string & {}`) so future Firebase codes don't break compilation while
 * still giving autocomplete for the codes we explicitly handle.
 */
export interface FirebaseAuthError {
  readonly name:    'FirebaseError';
  readonly code:    FirebaseAuthCode | (string & {});
  readonly message: string;
}

/**
 * Maps a Firebase Auth error to a user-facing Error with a localised message.
 * Exported for unit testing without requiring Firebase SDK mocks.
 */
export function mapFirebaseSignInError(error: FirebaseAuthError): Error {
  switch (error.code) {
    case FIREBASE_AUTH_CODES.POPUP_CLOSED:
      return new Error('Sign-in cancelled');
    case FIREBASE_AUTH_CODES.POPUP_BLOCKED:
      return new Error('Popup blocked by browser. Please allow popups for this site.');
    default:
      return new Error(error.message || 'Sign-in failed');
  }
}

/**
 * Type guard that narrows `unknown` to `FirebaseAuthError` without any cast.
 * Checks the structural shape plus the `'FirebaseError'` name discriminant.
 */
export function isFirebaseAuthError(err: unknown): err is FirebaseAuthError {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as Record<string, unknown>;
  return (
    e['name']    === 'FirebaseError' &&
    typeof e['code']    === 'string' &&
    typeof e['message'] === 'string'
  );
}

/**
 * Cookie name for the auth hint.
 *
 * The `__Secure-` prefix is enforced by the browser: the cookie is accepted
 * only when set over a secure context (HTTPS / localhost), making it impossible
 * for plain-HTTP pages or subdomains to inject or overwrite it.
 *
 * Additional attributes applied at write-time:
 *  - `Secure`         — only transmitted over HTTPS (reinforces the prefix)
 *  - `SameSite=Strict`— never sent on cross-site requests (CSRF defence)
 *  - `Max-Age=30d`    — auto-expires; unlike localStorage, no permanent residue
 *  - `Path=/`         — scoped to the whole application
 *
 * The cookie is intentionally NOT `HttpOnly` because `initAuthListener()` must
 * be able to read it client-side to decide whether to load the Firebase SDK.
 * The stored value is `'1'` — a non-sensitive boolean hint, not a credential.
 */
const AUTH_HINT_COOKIE = '__Secure-fb_auth_hint';
const AUTH_HINT_MAX_AGE = 30 * 24 * 3600; // 30 days in seconds

function setAuthHint(): void {
  document.cookie =
    `${AUTH_HINT_COOKIE}=1; Secure; SameSite=Strict; Max-Age=${AUTH_HINT_MAX_AGE}; Path=/`;
}

function clearAuthHint(): void {
  document.cookie =
    `${AUTH_HINT_COOKIE}=; Secure; SameSite=Strict; Max-Age=0; Path=/`;
}

function hasAuthHint(): boolean {
  return document.cookie.split(';').some(c => c.trim().startsWith(`${AUTH_HINT_COOKIE}=1`));
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseAuthService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly ngZone = inject(NgZone);
  private readonly logger = inject(LoggerService);
  private readonly firebaseOptions = inject(FIREBASE_OPTIONS);

  private get isFirebaseConfigured(): boolean {
    return checkFirebaseOptions(this.firebaseOptions);
  }

  private readonly userSubject = new BehaviorSubject<AuthUser | null>(null);
  private readonly loadingSubject = new BehaviorSubject<boolean>(true);
  private authUnsubscribe: (() => void) | null = null;
  private isDestroyed = false;

  readonly user$ = this.userSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();

  get currentUser(): AuthUser | null {
    return this.userSubject.getValue();
  }

  get isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Initialises the Firebase auth state listener.
   *
   * Strategy:
   *  - Anonymous / first-time users: no hint cookie → Firebase SDK is NOT loaded;
   *    loading resolves immediately. SDK loads on demand when the user explicitly
   *    triggers sign-in via {@link performGoogleSignInDirect}.
   *  - Returning users (hint cookie present): Firebase SDK is loaded asynchronously
   *    (fire-and-forget, does not block APP_INITIALIZER) and the auth-state
   *    listener is wired up to restore the session transparently.
   */
  initAuthListener(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.loadingSubject.next(false);
      return;
    }

    if (!this.isFirebaseConfigured) {
      this.logger.warn('[FirebaseAuth] Firebase not configured, running in offline mode');
      this.loadingSubject.next(false);
      return;
    }

    const authHintPresent = hasAuthHint();
    if (!authHintPresent) {
      // Anonymous user — skip Firebase SDK entirely; resolve loading immediately.
      this.loadingSubject.next(false);
      return;
    }

    // Returning user — load Firebase SDK asynchronously (fire-and-forget).
    initFirebase()
      .then(() => this.setupAuthStateListener())
      .catch((error) => {
        this.logger.error('[FirebaseAuth] Failed to initialize auth listener:', error);
        this.loadingSubject.next(false);
      });
  }

  /**
   * Wires up onAuthStateChanged after Firebase has been initialised.
   * Idempotent — guards against duplicate listeners.
   */
  private setupAuthStateListener(): void {
    if (this.authUnsubscribe) return;

    const auth = getFirebaseAuth();
    const authModule = getFirebaseAuthModule();

    if (!auth || !authModule) {
      this.loadingSubject.next(false);
      return;
    }

    this.authUnsubscribe = authModule.onAuthStateChanged(auth, (user) => {
      this.ngZone.run(() => {
        if (user) {
          this.userSubject.next(this.mapFirebaseUser(user));
          setAuthHint();
          this.logger.info('[FirebaseAuth] User signed in:', user.email);
        } else {
          this.userSubject.next(null);
          clearAuthHint();
          this.logger.info('[FirebaseAuth] User signed out');
        }
        this.loadingSubject.next(false);
      });
    }, (error) => {
      this.ngZone.run(() => {
        this.logger.error('[FirebaseAuth] Auth state error:', error);
        this.loadingSubject.next(false);
      });
    });
  }

  async performGoogleSignInDirect(): Promise<AuthUser> {
    if (!isPlatformBrowser(this.platformId)) {
      throw new Error('Auth not available on server');
    }
    if (!this.isFirebaseConfigured) {
      throw new Error('Firebase not configured. Add credentials to environment.ts');
    }
    return this.performGoogleSignIn();
  }

  signInWithGoogle(): Observable<AuthUser> {
    if (!isPlatformBrowser(this.platformId)) {
      return from(Promise.reject(new Error('Auth not available on server')));
    }

    if (!this.isFirebaseConfigured) {
      return from(Promise.reject(new Error('Firebase not configured. Add credentials to environment.ts')));
    }

    return from(this.performGoogleSignIn());
  }

  private async performGoogleSignIn(): Promise<AuthUser> {
    if (this.isDestroyed) {
      throw new Error('Service destroyed');
    }

    // Load Firebase SDK on demand (no-op if already loaded for returning users).
    await initFirebase();

    // Wire up the auth-state listener if not already active (covers the
    // first-sign-in case where initAuthListener() skipped loading).
    this.setupAuthStateListener();

    const auth = getFirebaseAuth();
    const authModule = getFirebaseAuthModule();

    if (!auth || !authModule) {
      throw new Error('Firebase Auth not available');
    }

    const { GoogleAuthProvider, signInWithPopup, signInWithCredential } = authModule;

    // Try Google Identity Services first (no popup → avoids COOP header issues).
    if (environment.googleAuthClientId && isPlatformBrowser(this.platformId)) {
      try {
        return await this.signInWithGIS(auth, GoogleAuthProvider, signInWithCredential);
      } catch (error) {
        const msg = error instanceof Error ? error.message : '';
        if (msg.startsWith('GIS_')) {
          this.logger.info('[FirebaseAuth] GIS unavailable, falling back to popup');
        } else {
          throw error;
        }
      }
    }

    // Fallback: Firebase popup flow.
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');

    try {
      const result = await signInWithPopup(auth, provider);
      this.logger.info('[FirebaseAuth] Google sign-in successful');
      setAuthHint();
      return this.mapFirebaseUser(result.user);
    } catch (error: unknown) {
      if (isFirebaseAuthError(error)) {
        this.logger.error('[FirebaseAuth] Google sign-in failed:', error);
        throw mapFirebaseSignInError(error);
      }
      // Non-Firebase error (network timeout, internal, etc.) — re-throw as-is.
      throw error instanceof Error ? error : new Error('Sign-in failed');
    }
  }

  private signInWithGIS(
    auth: Auth,
    GoogleAuthProvider: typeof import('firebase/auth').GoogleAuthProvider,
    signInWithCredential: typeof import('firebase/auth').signInWithCredential,
  ): Promise<AuthUser> {
    return new Promise<AuthUser>((resolve, reject) => {
      const gis = window.google?.accounts?.id;
      if (!gis) {
        reject(new Error('GIS_NOT_LOADED'));
        return;
      }

      gis.initialize({
        client_id: environment.googleAuthClientId,
        callback: async (response: { credential: string }) => {
          try {
            const credential = GoogleAuthProvider.credential(response.credential);
            const result = await signInWithCredential(auth, credential);
            this.logger.info('[FirebaseAuth] GIS sign-in successful');
            setAuthHint();
            resolve(this.mapFirebaseUser(result.user));
          } catch (error) {
            this.logger.error('[FirebaseAuth] GIS credential sign-in failed:', error);
            reject(error);
          }
        },
        auto_select: true,
      });

      gis.prompt();
    });
  }

  signOut(): Observable<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return from(Promise.resolve());
    }

    if (!this.isFirebaseConfigured) {
      return from(Promise.resolve());
    }

    return from(this.performSignOut());
  }

  private async performSignOut(): Promise<void> {
    const auth = getFirebaseAuth();
    const authModule = getFirebaseAuthModule();

    if (!auth || !authModule) {
      clearAuthHint();
      return;
    }

    try {
      await authModule.signOut(auth);
      clearAuthHint();
      this.logger.info('[FirebaseAuth] Sign-out successful');
    } catch (error) {
      this.logger.error('[FirebaseAuth] Sign-out failed:', error);
      throw error;
    }
  }

  private mapFirebaseUser(user: User): AuthUser {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL
    };
  }

  destroy(): void {
    this.isDestroyed = true;
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
      this.authUnsubscribe = null;
    }
  }
}
