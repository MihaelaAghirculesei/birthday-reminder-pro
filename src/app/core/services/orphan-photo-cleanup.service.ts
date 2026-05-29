import { Injectable, inject, isDevMode } from '@angular/core';
import { LoggerService } from './logger.service';
import { IndexedDBStorageService } from './offline-storage.service';
import { FIREBASE_OPTIONS, checkFirebaseOptions, storageGetters } from '../../firebase.config';
import type { FirebaseOptions } from 'firebase/app';
import type { Birthday } from '../../shared/models/birthday.model';

const CLEANUP_KEY = '__orphan_cleanup_ts';
const INTERVAL_MS = 24 * 60 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class OrphanPhotoCleanupService {
  private readonly logger = inject(LoggerService);
  private readonly offlineStorage = inject(IndexedDBStorageService);
  private readonly firebaseOptions = inject<FirebaseOptions | undefined>(FIREBASE_OPTIONS);

  // ─── extractStoragePath ───────────────────────────────────────────────────

  /**
   * Extracts the decoded storage path from a Firebase Storage download URL.
   * Returns `null` for empty strings or non-Storage URLs.
   *
   * @example
   * extractStoragePath('https://firebasestorage.googleapis.com/v0/b/proj/o/users%2Fuid%2Fphoto.jpg?alt=media')
   * // → 'users/uid/photo.jpg'
   */
  extractStoragePath(url: string): string | null {
    if (!url) return null;

    const oIndex = url.indexOf('/o/');
    if (oIndex === -1) return null;

    const afterO = url.slice(oIndex + 3);
    const boundary = afterO.search(/[?#]/);
    const encoded = boundary === -1 ? afterO : afterO.slice(0, boundary);

    return decodeURIComponent(encoded);
  }

  // ─── isDue ────────────────────────────────────────────────────────────────

  /**
   * Returns `true` when a cleanup run should be triggered:
   * - No previous run has been recorded, or
   * - The last run was ≥ 24 h ago, or
   * - `localStorage` throws (e.g. quota exceeded).
   */
  isDue(): boolean {
    try {
      const ts = localStorage.getItem(CLEANUP_KEY);
      if (!ts) return true;
      return Date.now() - Number(ts) >= INTERVAL_MS;
    } catch {
      return true;
    }
  }

  // ─── cleanupOrphans ───────────────────────────────────────────────────────

  /**
   * Scans the Firebase Storage folder for `userId` and deletes files that are
   * no longer referenced by any birthday in IndexedDB.
   *
   * Guards:
   * - Exits immediately when Firebase is not configured.
   * - Exits immediately when the last cleanup ran < 24 h ago.
   * - Exits when the Storage SDK is unavailable after `initFirebase()`.
   *
   * Individual delete failures are logged and counted but do not abort the run.
   * A `listAll` failure logs a warning and resolves without throwing.
   */
  protected isDevEnvironment(): boolean {
    return isDevMode();
  }

  async cleanupOrphans(userId: string): Promise<void> {
    if (this.isDevEnvironment()) return;
    if (!checkFirebaseOptions(this.firebaseOptions)) return;
    if (!this.isDue()) return;

    await storageGetters.initFirebase();
    const storage = storageGetters.getFirebaseStorage();
    const storageModule = storageGetters.getStorageModule();
    if (!storage || !storageModule) return;

    const { ref, listAll, deleteObject } = storageModule;

    try {
      const birthdays: Birthday[] = await this.offlineStorage.getBirthdays();
      const usedPaths = new Set<string>();
      for (const b of birthdays) {
        const photoPath = this.extractStoragePath(b.photo ?? '');
        const rememberPath = this.extractStoragePath(b.rememberPhoto ?? '');
        if (photoPath) usedPaths.add(photoPath);
        if (rememberPath) usedPaths.add(rememberPath);
      }

      const folderRef = ref(storage, `users/${userId}/photos`);
      const { items } = await listAll(folderRef);

      let deleted = 0;
      let failed = 0;

      for (const item of items) {
        if (usedPaths.has(item.fullPath)) continue;

        try {
          await deleteObject(item);
          this.logger.info('[OrphanCleanup] Deleted orphan:', item.fullPath);
          deleted++;
        } catch (err) {
          this.logger.warn('[OrphanCleanup] Could not delete orphan:', item.fullPath, err);
          failed++;
        }
      }

      localStorage.setItem(CLEANUP_KEY, String(Date.now()));
      this.logger.info(
        `[OrphanCleanup] Complete — deleted: ${deleted}, failed: ${failed}, scanned: ${items.length}`
      );
    } catch (err) {
      this.logger.warn('[OrphanCleanup] Aborted:', err);
    }
  }
}
