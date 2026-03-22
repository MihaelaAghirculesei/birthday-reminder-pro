import { Injectable, inject, PLATFORM_ID, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { Auth, User } from 'firebase/auth';
import { Observable, BehaviorSubject, from } from 'rxjs';
import {
  getFirebaseAuth,
  getFirebaseAuthModule,
  initFirebase,
  isFirebaseConfigured,
} from '../../firebase.config';
import { environment } from '../../../environments/environment';
import { LoggerService } from './logger.service';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

/**
 * Persisted across page loads to determine whether the Firebase SDK should be
 * loaded eagerly (returning authenticated user) or skipped (anonymous user).
 * Set on successful sign-in, cleared on sign-out or session expiry.
 */
const AUTH_HINT_KEY = 'fb_auth_hint';

@Injectable({
  providedIn: 'root'
})
export class FirebaseAuthService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly ngZone = inject(NgZone);
  private readonly logger = inject(LoggerService);

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
   *  - Anonymous / first-time users: no hint in localStorage → Firebase SDK is
   *    NOT loaded; loading resolves immediately. SDK loads on demand when the
   *    user explicitly triggers sign-in via {@link performGoogleSignInDirect}.
   *  - Returning users (hint present): Firebase SDK is loaded asynchronously
   *    (fire-and-forget, does not block APP_INITIALIZER) and the auth-state
   *    listener is wired up to restore the session transparently.
   */
  initAuthListener(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.loadingSubject.next(false);
      return;
    }

    if (!isFirebaseConfigured()) {
      this.logger.warn('[FirebaseAuth] Firebase not configured, running in offline mode');
      this.loadingSubject.next(false);
      return;
    }

    const hasAuthHint = !!localStorage.getItem(AUTH_HINT_KEY);
    if (!hasAuthHint) {
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
          localStorage.setItem(AUTH_HINT_KEY, '1');
          this.logger.info('[FirebaseAuth] User signed in:', user.email);
        } else {
          this.userSubject.next(null);
          localStorage.removeItem(AUTH_HINT_KEY);
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
    if (!isFirebaseConfigured()) {
      throw new Error('Firebase not configured. Add credentials to environment.ts');
    }
    return this.performGoogleSignIn();
  }

  signInWithGoogle(): Observable<AuthUser> {
    if (!isPlatformBrowser(this.platformId)) {
      return from(Promise.reject(new Error('Auth not available on server')));
    }

    if (!isFirebaseConfigured()) {
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
      localStorage.setItem(AUTH_HINT_KEY, '1');
      return this.mapFirebaseUser(result.user);
    } catch (error: unknown) {
      const firebaseError = error as { code?: string; message?: string };
      this.logger.error('[FirebaseAuth] Google sign-in failed:', firebaseError);

      if (firebaseError.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in cancelled');
      }
      if (firebaseError.code === 'auth/popup-blocked') {
        throw new Error('Popup blocked by browser. Please allow popups for this site.');
      }

      throw new Error(firebaseError.message || 'Sign-in failed');
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
            localStorage.setItem(AUTH_HINT_KEY, '1');
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

    if (!isFirebaseConfigured()) {
      return from(Promise.resolve());
    }

    return from(this.performSignOut());
  }

  private async performSignOut(): Promise<void> {
    const auth = getFirebaseAuth();
    const authModule = getFirebaseAuthModule();

    if (!auth || !authModule) {
      localStorage.removeItem(AUTH_HINT_KEY);
      return;
    }

    try {
      await authModule.signOut(auth);
      localStorage.removeItem(AUTH_HINT_KEY);
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
