import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

import { from, type Observable } from 'rxjs';

import {
  checkFirebaseOptions,
  FIREBASE_OPTIONS,
  firebaseGetters,
  getFirebaseAuth,
  getFirebaseAuthModule,
  storageGetters,
} from '../../firebase.config';
import { LoggerService } from './logger.service';
import { IndexedDBStorageService } from './offline-storage.service';

const FIRESTORE_BATCH_LIMIT = 450;

@Injectable({ providedIn: 'root' })
export class AccountDeletionService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly idb = inject(IndexedDBStorageService);
  private readonly logger = inject(LoggerService);
  private readonly firebaseOptions = inject(FIREBASE_OPTIONS);

  private get isFirebaseConfigured(): boolean {
    return checkFirebaseOptions(this.firebaseOptions);
  }

  deleteAccount(userId: string): Observable<void> {
    return from(this.performDeletion(userId));
  }

  private async performDeletion(userId: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      throw new Error('Not available server-side');
    }
    if (!this.isFirebaseConfigured) {
      throw new Error('Firebase not configured');
    }

    // Order matters: delete remote data while still authenticated, IDB last
    await this.deleteFirestoreData(userId);
    await this.deleteStorageFiles(userId);
    await this.idb.clear();
    await this.deleteAuthUser();
  }

  private async deleteFirestoreData(userId: string): Promise<void> {
    const db = firebaseGetters.getFirebaseFirestore();
    const fs = firebaseGetters.getFirestoreModule();
    if (!db || !fs) return;

    const userPath = `users/${userId}`;

    for (const collectionName of ['birthdays', 'categories'] as const) {
      const snapshot = await fs.getDocs(fs.collection(db, userPath, collectionName));
      if (snapshot.empty) continue;

      const docs = snapshot.docs;
      for (let i = 0; i < docs.length; i += FIRESTORE_BATCH_LIMIT) {
        const batch = fs.writeBatch(db);
        for (const d of docs.slice(i, i + FIRESTORE_BATCH_LIMIT)) {
          batch.delete(d.ref);
        }
        await batch.commit();
      }
    }

    try {
      await fs.deleteDoc(fs.doc(db, userPath, 'rateLimit', 'writes'));
    } catch {
      // No-op — doc may not exist yet
    }

    this.logger.info('[AccountDeletion] Firestore data removed for user:', userId);
  }

  private async deleteStorageFiles(userId: string): Promise<void> {
    const storage = storageGetters.getFirebaseStorage();
    const storageModule = storageGetters.getStorageModule();
    if (!storage || !storageModule) return;

    try {
      const { ref, listAll, deleteObject } = storageModule;
      const folderRef = ref(storage, `users/${userId}/photos`);
      const { items } = await listAll(folderRef);
      await Promise.all(items.map(item => deleteObject(item)));
      this.logger.info(`[AccountDeletion] Removed ${items.length} Storage file(s) for user:`, userId);
    } catch (err) {
      // Non-fatal: folder may not exist (user never uploaded photos)
      this.logger.warn('[AccountDeletion] Storage cleanup error (non-fatal):', err);
    }
  }

  private async deleteAuthUser(): Promise<void> {
    const auth = getFirebaseAuth();
    const authModule = getFirebaseAuthModule();
    if (!auth || !authModule) return;

    const user = auth.currentUser;
    if (!user) return;

    await authModule.deleteUser(user);
    this.logger.info('[AccountDeletion] Firebase Auth user deleted');
  }
}
