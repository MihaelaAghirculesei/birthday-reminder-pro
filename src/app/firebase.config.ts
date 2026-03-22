import { environment } from '../environments/environment';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _authModule: typeof import('firebase/auth') | null = null;
let _firestoreModule: typeof import('firebase/firestore') | null = null;
let _initPromise: Promise<void> | null = null;

/**
 * Returns true if the Firebase environment config has real credentials
 * (not placeholder values).
 */
export function isFirebaseConfigured(): boolean {
  const config = environment.firebase;
  return !!(
    config &&
    config.apiKey &&
    !config.apiKey.startsWith('YOUR_') &&
    config.projectId &&
    !config.projectId.startsWith('YOUR_')
  );
}

/**
 * Lazily loads the Firebase SDK into a separate chunk and initializes the
 * app/auth/firestore singletons. Safe to call multiple times — returns the
 * same promise on subsequent calls.
 *
 * Must be awaited before calling any getFirebase*() or get*Module() getter.
 * Called once during APP_INITIALIZER in app.config.ts.
 */
export function initFirebase(): Promise<void> {
  if (!isFirebaseConfigured()) return Promise.resolve();
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const [appModule, authModule, firestoreModule] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
      import('firebase/firestore'),
    ]);

    _authModule = authModule;
    _firestoreModule = firestoreModule;

    if (!_app) {
      const { initializeApp, getApps } = appModule;
      const existingApps = getApps();
      _app = existingApps.length > 0
        ? existingApps[0]
        : initializeApp(environment.firebase);
    }

    _auth = authModule.getAuth(_app);
    _db = firestoreModule.getFirestore(_app);
  })();

  return _initPromise;
}

// ─── Singleton getters (available after initFirebase() resolves) ─────────────

export function getFirebaseApp(): FirebaseApp | null { return _app; }
export function getFirebaseAuth(): Auth | null { return _auth; }
export function getFirebaseFirestore(): Firestore | null { return _db; }

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

// Legacy aliases kept for backwards compatibility
export const FIREBASE_APP = getFirebaseApp;
export const FIREBASE_AUTH = getFirebaseAuth;
export const FIREBASE_FIRESTORE = getFirebaseFirestore;
