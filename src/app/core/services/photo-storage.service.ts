import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  getFirebaseStorage,
  getStorageModule,
  initFirebase,
  checkFirebaseOptions,
  FIREBASE_OPTIONS,
} from '../../firebase.config';
import { LoggerService } from './logger.service';

/**
 * Handles photo storage using Firebase Storage (CDN) instead of base64 blobs.
 *
 * Storage path convention:
 *   users/{userId}/photos/{randomUUID}_{type}.{ext}
 *
 * The UUID is decoupled from the birthday ID so photos can be uploaded before
 * the birthday record is created (i.e., during the add-birthday flow where the
 * birthday ID is assigned later by the NgRx effect).
 *
 * Offline / unauthenticated fallback: if Firebase is not configured or the
 * upload fails, the method returns a base64 data URL so the birthday can still
 * be saved locally.
 */
@Injectable({ providedIn: 'root' })
export class PhotoStorageService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly logger = inject(LoggerService);
  private readonly firebaseOptions = inject(FIREBASE_OPTIONS);

  private get isFirebaseConfigured(): boolean {
    return checkFirebaseOptions(this.firebaseOptions);
  }

  // ─── Type guards ──────────────────────────────────────────────────────────

  /** Returns true for Firebase Storage CDN download URLs. */
  isStorageUrl(value: string): boolean {
    return (
      value.startsWith('https://firebasestorage.googleapis.com') ||
      value.startsWith('https://storage.googleapis.com')
    );
  }

  /** Returns true for base64-encoded data URLs (legacy format). */
  isBase64(value: string): boolean {
    return value.startsWith('data:image/');
  }

  // ─── Upload ───────────────────────────────────────────────────────────────

  /**
   * Uploads a File to Firebase Storage and returns its public CDN download URL.
   *
   * Falls back to a base64 data URL when:
   *  - running on the server (SSR)
   *  - Firebase is not configured (offline / missing credentials)
   *  - the upload itself fails (network error, quota exceeded, etc.)
   */
  async uploadPhoto(
    file: File,
    userId: string,
    type: 'photo' | 'rememberPhoto'
  ): Promise<string> {
    if (!isPlatformBrowser(this.platformId) || !this.isFirebaseConfigured) {
      return this.fileToBase64(file);
    }

    try {
      await initFirebase();
      const storage = getFirebaseStorage();
      const st = getStorageModule();
      if (!storage || !st) return this.fileToBase64(file);

      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const uid = crypto.randomUUID();
      const path = `users/${userId}/photos/${uid}_${type}.${ext}`;
      const storageRef = st.ref(storage, path);

      await st.uploadBytes(storageRef, file, { contentType: file.type || 'image/jpeg' });
      const url = await st.getDownloadURL(storageRef);

      this.logger.info('[PhotoStorage] Uploaded:', path);
      return url;
    } catch (error) {
      this.logger.error('[PhotoStorage] Upload failed, falling back to base64:', error);
      return this.fileToBase64(file);
    }
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  /**
   * Deletes a photo from Firebase Storage by its download URL.
   * Silently no-ops for non-Storage URLs (base64, external CDNs, empty strings).
   */
  async deletePhotoByUrl(url: string): Promise<void> {
    if (!url || !this.isStorageUrl(url) || !this.isFirebaseConfigured) return;

    try {
      await initFirebase();
      const storage = getFirebaseStorage();
      const st = getStorageModule();
      if (!storage || !st) return;

      // st.ref() accepts full HTTPS download URLs in addition to storage paths.
      const storageRef = st.ref(storage, url);
      await st.deleteObject(storageRef);
      this.logger.info('[PhotoStorage] Deleted:', url);
    } catch (error) {
      // The object may have already been deleted or the URL may have expired.
      this.logger.warn('[PhotoStorage] Delete skipped or failed:', error);
    }
  }

  // ─── Migration ────────────────────────────────────────────────────────────

  /**
   * Migrates a legacy base64 photo string to Firebase Storage.
   * Returns the new CDN URL, or the original value if migration is not needed
   * (already a URL) or fails.
   */
  async migrateBase64(
    base64: string,
    userId: string,
    type: 'photo' | 'rememberPhoto'
  ): Promise<string> {
    if (!this.isBase64(base64)) return base64;

    const file = this.base64ToFile(base64, `${type}.jpg`);
    return this.uploadPhoto(file, userId, type);
  }

  // ─── Utilities ────────────────────────────────────────────────────────────

  /** Converts a File to a base64 data URL (used as offline fallback). */
  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target!.result as string);
      reader.onerror = () => reject(new Error('FileReader failed'));
      reader.readAsDataURL(file);
    });
  }

  private base64ToFile(base64: string, filename: string): File {
    const [header, data] = base64.split(',');
    const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new File([bytes], filename, { type: mime });
  }
}
