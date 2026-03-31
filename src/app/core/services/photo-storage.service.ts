import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { LoggerService } from './logger.service';
import { NotificationService } from './notification.service';
import { FIREBASE_OPTIONS, checkFirebaseOptions, storageGetters } from '../../firebase.config';
import type { FirebaseOptions } from 'firebase/app';

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

  // ─── Upload ───────────────────────────────────────────────────────────────

  /**
   * Uploads a photo to Firebase Storage and returns the CDN download URL.
   * Falls back to a base64 data URL when running on the server (SSR),
   * when Firebase is not configured, or when the upload fails.
   * Shows a warning notification when falling back due to an upload error.
   */
  async uploadPhoto(
    file: File,
    userId: string,
    type: 'photo' | 'rememberPhoto'
  ): Promise<string> {
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
      await deleteObject(ref(storage, url));
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
