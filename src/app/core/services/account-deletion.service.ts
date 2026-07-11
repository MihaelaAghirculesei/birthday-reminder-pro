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
import { CategoryStorageService } from './category-storage.service';
import { ErrorReportingService } from './error-reporting.service';
import { IndexedDBConnectionService } from './indexeddb-connection.service';
import { LoggerService } from './logger.service';
import { PendingChangesService } from './pending-changes.service';
import { SecureStorageService } from './secure-storage.service';

const FIRESTORE_BATCH_LIMIT = 450;

@Injectable({ providedIn: 'root' })
export class AccountDeletionService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly idbConnection = inject(IndexedDBConnectionService);
  private readonly pendingChanges = inject(PendingChangesService);
  private readonly errorReporting = inject(ErrorReportingService);
  private readonly secureStorage = inject(SecureStorageService);
  private readonly categoryStorage = inject(CategoryStorageService);
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

    // Order matters: delete remote data while still authenticated, local data last
    await this.deleteFirestoreData(userId);
    await this.deleteStorageFiles(userId);
    await this.deleteLocalData();
    await this.deleteAuthUser();
  }

  /**
   * Wipes every local data source derived from the account: all IndexedDB
   * object stores (birthdays, scheduled messages, pending sync queue, error
   * reports), locally-cached category customizations, and the encryption key
   * guarding SecureStorageService (crypto-shredding any encrypted secrets —
   * e.g. a Google Calendar OAuth token — so they become unrecoverable even if
   * the raw ciphertext is still sitting in localStorage).
   */
  private async deleteLocalData(): Promise<void> {
    await this.idbConnection.clearAllStores();
    await this.pendingChanges.clearAll();
    await this.errorReporting.clearErrors();
    await this.secureStorage.clearEncryptionKey();
    this.categoryStorage.clearAll();
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
      // Photos live under per-type subfolders (users/{userId}/photo/,
      // users/{userId}/rememberPhoto/ — see storage.rules), not directly
      // under users/{userId}/. listAll() is non-recursive, so the subfolders
      // ("prefixes") must be listed individually to reach their files.
      const userFolderRef = ref(storage, `users/${userId}`);
      const { prefixes, items: rootItems } = await listAll(userFolderRef);
      const nested = await Promise.all((prefixes ?? []).map(prefix => listAll(prefix).then(r => r.items)));
      const items = [...rootItems, ...nested.flat()];

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
