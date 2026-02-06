import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { environment } from '../environments/environment';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;

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

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) {
    return null;
  }

  if (!app) {
    const existingApps = getApps();
    app = existingApps.length > 0
      ? existingApps[0]
      : initializeApp(environment.firebase);
  }
  return app;
}

export function getFirebaseAuth(): Auth | null {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    return null;
  }

  if (!auth) {
    auth = getAuth(firebaseApp);
  }
  return auth;
}

export function getFirebaseFirestore(): Firestore | null {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    return null;
  }

  if (!firestore) {
    firestore = getFirestore(firebaseApp);
  }
  return firestore;
}

export const FIREBASE_APP = getFirebaseApp;
export const FIREBASE_AUTH = getFirebaseAuth;
export const FIREBASE_FIRESTORE = getFirebaseFirestore;
