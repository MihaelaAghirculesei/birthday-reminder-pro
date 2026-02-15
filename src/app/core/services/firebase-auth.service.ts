import { Injectable, inject, PLATFORM_ID, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  Unsubscribe
} from 'firebase/auth';
import { Observable, BehaviorSubject, from } from 'rxjs';
import { getFirebaseAuth, isFirebaseConfigured } from '../../firebase.config';
import { LoggerService } from './logger.service';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseAuthService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly ngZone = inject(NgZone);
  private readonly logger = inject(LoggerService);

  private readonly userSubject = new BehaviorSubject<AuthUser | null>(null);
  private readonly loadingSubject = new BehaviorSubject<boolean>(true);
  private authUnsubscribe: Unsubscribe | null = null;
  private isDestroyed = false;

  readonly user$ = this.userSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();

  get currentUser(): AuthUser | null {
    return this.userSubject.getValue();
  }

  get isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

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

    try {
      const auth = getFirebaseAuth();

      if (!auth) {
        this.loadingSubject.next(false);
        return;
      }

      this.authUnsubscribe = onAuthStateChanged(auth, (user) => {
        this.ngZone.run(() => {
          if (user) {
            this.userSubject.next(this.mapFirebaseUser(user));
            this.logger.info('[FirebaseAuth] User signed in:', user.email);
          } else {
            this.userSubject.next(null);
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
    } catch (error) {
      this.logger.error('[FirebaseAuth] Failed to initialize auth listener:', error);
      this.loadingSubject.next(false);
    }
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

    const auth = getFirebaseAuth();

    if (!auth) {
      throw new Error('Firebase Auth not available');
    }

    const provider = new GoogleAuthProvider();

    provider.addScope('email');
    provider.addScope('profile');

    try {
      const result = await signInWithPopup(auth, provider);
      this.logger.info('[FirebaseAuth] Google sign-in successful');
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

    if (!auth) {
      return;
    }

    try {
      await signOut(auth);
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
