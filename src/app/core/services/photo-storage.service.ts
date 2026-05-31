import { isPlatformServer } from '@angular/common';
import { inject,Injectable, PLATFORM_ID } from '@angular/core';

import type { FirebaseOptions } from 'firebase/app';

import { checkFirebaseOptions, FIREBASE_OPTIONS, storageGetters } from '../../firebase.config';
import { LoggerService } from './logger.service';
import { NotificationService } from './notification.service';

@Injectable({ providedIn: 'root' })
export class PhotoStorageService {
  private readonly logger = inject(LoggerService);
  private readonly notification = inject(NotificationService);
  private readonly firebaseOptions = inject<FirebaseOptions | undefined>(FIREBASE_OPTIONS);
  private readonly isServer = isPlatformServer(inject(PLATFORM_ID));

  // ─── Type guards ──────────────────────────────────────────────────────────

  /** Returns true for Firebase Storage CDN download URLs. */
  isStorageUrl(value: string): boolean {
    return (
      value.startsWith('https://firebasestorage.googleapis.com') ||
      value.startsWith('https://storage.googleapis.com')
    );
  }

  /** Returns true for base64-encoded data URLs (legacy format, safe MIME types only). */
  isBase64(value: string): boolean {
    const SAFE_PREFIXES = [
      'data:image/jpeg;',
      'data:image/png;',
      'data:image/webp;',
    ] as const;
    return SAFE_PREFIXES.some(prefix => value.startsWith(prefix));
  }

  /**
   * Extracts the decoded Storage object path from a Firebase Storage download URL.
   * Returns null for empty strings or URLs without an `/o/` segment.
   *
   * @example
   * extractPath('https://firebasestorage.googleapis.com/v0/b/proj/o/users%2Fuid%2Fphoto.jpg?alt=media')
   * // → 'users/uid/photo.jpg'
   */
  extractPath(url: string): string | null {
    if (!url) return null;
    const oIndex = url.indexOf('/o/');
    if (oIndex === -1) return null;
    const afterO = url.slice(oIndex + 3);
    const boundary = afterO.search(/[?#]/);
    const encoded = boundary === -1 ? afterO : afterO.slice(0, boundary);
    return decodeURIComponent(encoded);
  }

  /**
   * Resolves a Storage path to a download URL by calling getDownloadURL().
   *
   * Unlike the URL returned at upload time (a permanent capability URL that bypasses
   * Security Rules), this call is evaluated against the rules at resolution time —
   * the caller must be authenticated as the resource owner. Storing paths in Firestore
   * instead of capability URLs prevents photo access even if Firestore data is leaked.
   *
   * Returns null when running server-side, when Firebase is unconfigured, or on RPC failure.
   */
  async resolveUrl(path: string): Promise<string | null> {
    if (path.startsWith('https://') || path.startsWith('http://')) return path;
    if (this.isServer || !checkFirebaseOptions(this.firebaseOptions)) return null;
    try {
      await storageGetters.initFirebase();
      const storage = storageGetters.getFirebaseStorage();
      const storageModule = storageGetters.getStorageModule();
      if (!storage || !storageModule) return null;
      const { ref, getDownloadURL } = storageModule;
      return await getDownloadURL(ref(storage, path));
    } catch (err) {
      this.logger.warn('PhotoStorageService: failed to resolve Storage path to URL:', path, err);
      return null;
    }
  }

  // ─── Upload ───────────────────────────────────────────────────────────────

  private static readonly MAX_FILE_BYTES = 7 * 1024 * 1024; // matches Zod schema limit

  /**
   * Validates a file before upload. Throws immediately if the file exceeds
   * the maximum allowed size, providing instant client-side feedback
   * without starting any network operation.
   */
  private validatePhoto(file: File): void {
    if (file.size > PhotoStorageService.MAX_FILE_BYTES) {
      throw new Error(
        `Photo exceeds maximum allowed size of 7 MB (file: ${file.size} bytes)`
      );
    }
  }

  /**
   * Uploads a photo to Firebase Storage and returns the CDN download URL.
   * Falls back to a base64 data URL when running on the server (SSR),
   * when Firebase is not configured, or when the upload fails.
   * Shows a warning notification when falling back due to an upload error.
   * Throws synchronously for invalid files (e.g. size > 7 MB) before any
   * network operation is attempted.
   */
  async uploadPhoto(
    file: File,
    userId: string,
    type: 'photo' | 'rememberPhoto'
  ): Promise<string> {
    this.validatePhoto(file);

    if (this.isServer || !checkFirebaseOptions(this.firebaseOptions)) {
      return this.fileToBase64(file);
    }

    try {
      await storageGetters.initFirebase();
      const storage = storageGetters.getFirebaseStorage();
      const storageModule = storageGetters.getStorageModule();
      if (!storage || !storageModule) {
        return this.fileToBase64(file);
      }

      const { ref, uploadBytes, getDownloadURL } = storageModule;
      const path = `users/${userId}/${type}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      return await getDownloadURL(storageRef);
    } catch (err) {
      this.logger.warn('PhotoStorageService: upload failed, falling back to base64', err);
      this.notification.show('Foto salvata in locale — cloud sync in sospeso', 'warning');
      return this.fileToBase64(file);
    }
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  /**
   * Deletes a photo from Firebase Storage by its download URL.
   * No-op for empty strings, non-storage URLs, or when Firebase is not configured.
   */
  async deletePhotoByUrl(url: string): Promise<void> {
    if (!url || !this.isStorageUrl(url) || !checkFirebaseOptions(this.firebaseOptions)) {
      return;
    }

    try {
      await storageGetters.initFirebase();
      const storage = storageGetters.getFirebaseStorage();
      const storageModule = storageGetters.getStorageModule();
      if (!storage || !storageModule) return;

      const { ref, deleteObject } = storageModule;
      const path = this.extractPath(url);
      await deleteObject(ref(storage, path ?? url));
    } catch (err) {
      this.logger.warn('PhotoStorageService: delete failed', err);
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

    const file = await this.base64ToFile(base64, `${type}.jpg`);
    return this.uploadPhoto(file, userId, type);
  }

  // ─── Utilities ────────────────────────────────────────────────────────────

  /** Converts a File to a base64 data URL (used as offline fallback). */
  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
      reader.readAsDataURL(file);
    });
  }

  private async base64ToFile(base64: string, filename: string): Promise<File> {
    const res = await fetch(base64);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type });
  }
}
