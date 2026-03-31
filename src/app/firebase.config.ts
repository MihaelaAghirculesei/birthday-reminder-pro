import { InjectionToken } from '@angular/core';
import { environment } from '../environments/environment';
import type { FirebaseApp, FirebaseOptions } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;
let _authModule: typeof import('firebase/auth') | null = null;
let _firestoreModule: typeof import('firebase/firestore') | null = null;
let _storageModule: typeof import('firebase/storage') | null = null;
let _initPromise: Promise<void> | null = null;

/**
 * DI token for the Firebase client configuration.
 *
 * Defaults to `environment.firebase` in production.
 * Override with `{ provide: FIREBASE_OPTIONS, useValue: undefined }` in tests
 * to keep Firebase un-initialised without mutating the `environment` object.
 */
export const FIREBASE_OPTIONS = new InjectionToken<FirebaseOptions | undefined>(
  'FIREBASE_OPTIONS',
  { providedIn: 'root', factory: () => environment.firebase }
);

/**
 * Pure predicate — accepts an explicit config value so it can be used both
 * by injectable services (passing their injected token value) and by the
 * module-level `initFirebase()` (passing `environment.firebase` directly).
 */
export function checkFirebaseOptions(opts: FirebaseOptions | undefined): boolean {
  return !!(
    opts?.apiKey &&
    !opts.apiKey.startsWith('YOUR_') &&
    opts?.projectId &&
    !opts.projectId.startsWith('YOUR_')
  );
}

/**
 * Module-level convenience — used internally by `initFirebase()`.
 * Services should prefer injecting `FIREBASE_OPTIONS` and calling
 * `checkFirebaseOptions(this.firebaseOptions)` instead.
 */
export function isFirebaseConfigured(): boolean {
  return checkFirebaseOptions(environment.firebase);
}

/**
 * Lazily loads the Firebase SDK into a separate chunk and initializes the
 * app/auth/firestore/storage singletons. Safe to call multiple times — returns the
 * same promise on subsequent calls.
 *
 * Must be awaited before calling any getFirebase*() or get*Module() getter.
 * Called on-demand: by initAuthListener() for returning users and by performGoogleSignIn()
 * on first sign-in. Never called from APP_INITIALIZER — anonymous users never pay the cost.
 */
export function initFirebase(): Promise<void> {
  if (!isFirebaseConfigured()) return Promise.resolve();
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const [appModule, authModule, firestoreModule, storageModule] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
      import('firebase/firestore'),
      import('firebase/storage'),
    ]);

    _authModule = authModule;
    _firestoreModule = firestoreModule;
    _storageModule = storageModule;

    if (!_app) {
      const { initializeApp, getApps } = appModule;
      const existingApps = getApps();
      _app = existingApps.length > 0
        ? existingApps[0]
        : initializeApp(environment.firebase);
    }

    _auth = authModule.getAuth(_app);
    _db = firestoreModule.getFirestore(_app);
    _storage = storageModule.getStorage(_app);
  })();

  return _initPromise;
}

// ─── Singleton getters (available after initFirebase() resolves) ─────────────

export function getFirebaseApp(): FirebaseApp | null { return _app; }
export function getFirebaseAuth(): Auth | null { return _auth; }
export function getFirebaseFirestore(): Firestore | null { return _db; }
export function getFirebaseStorage(): FirebaseStorage | null { return _storage; }

/**
 * Full firebase/auth module — needed by FirebaseAuthService to call
 * onAuthStateChanged, signInWithPopup, signOut, etc. without a static import.
 */
export function getFirebaseAuthModule(): typeof import('firebase/auth') | null {
  return _authModule;
}

/**
 * Full firebase/firestore module — needed by FirestoreService to call
 * collection, doc, writeBatch, etc. without a static import.
 */
export function getFirestoreModule(): typeof import('firebase/firestore') | null {
  return _firestoreModule;
}

/**
 * Full firebase/storage module — needed by PhotoStorageService to call
 * ref, uploadBytes, getDownloadURL, deleteObject, etc. without a static import.
 */
export function getStorageModule(): typeof import('firebase/storage') | null {
  return _storageModule;
}

/**
 * Mutable accessor bag for the two getters used by FirestoreService.
 *
 * ES-module named exports are compiled as non-configurable/non-writable
 * properties by Webpack, making them impossible to spy on with Jasmine.
 * A plain-object property IS writable, so tests can do:
 *   spyOn(firebaseGetters, 'getFirebaseFirestore').and.returnValue(...)
 */
export const firebaseGetters = {
  getFirebaseFirestore: (): Firestore | null => _db,
  getFirestoreModule: (): typeof import('firebase/firestore') | null => _firestoreModule,
};

/**
 * Mutable accessor bag for Firebase Storage getters.
 *
 * ES-module named exports are compiled as non-configurable/non-writable
 * properties by Webpack, making them impossible to spy on with Jasmine.
 * A plain-object property IS writable, so tests can do:
 *   spyOn(storageGetters, 'getFirebaseStorage').and.returnValue(...)
 */
export const storageGetters = {
  initFirebase: (): Promise<void> => initFirebase(),
  getFirebaseStorage: (): FirebaseStorage | null => _storage,
  getStorageModule: (): typeof import('firebase/storage') | null => _storageModule,
};

// Legacy aliases kept for backwards compatibility
export const FIREBASE_APP = getFirebaseApp;
export const FIREBASE_AUTH = getFirebaseAuth;
export const FIREBASE_FIRESTORE = getFirebaseFirestore;
