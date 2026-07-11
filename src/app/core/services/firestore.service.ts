import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, NgZone, PLATFORM_ID } from '@angular/core';

import type { DocumentData, QuerySnapshot, WriteBatch } from 'firebase/firestore';
import { BehaviorSubject, from, type Observable, of } from 'rxjs';

import { checkFirebaseOptions, FIREBASE_OPTIONS, firebaseGetters } from '../../firebase.config';
import { type Birthday, type Category } from '../../shared/models/birthday.model';
import { toDateString } from '../../shared/utils/date';
import { LoggerService } from './logger.service';
import { PhotoStorageService } from './photo-storage.service';

/** Firebase error codes that indicate transient failures safe to retry. */
const RETRYABLE_CODES = new Set(['unavailable', 'deadline-exceeded', 'internal', 'resource-exhausted']);

/** Code returned by Firebase when the write quota / rate-limit is exceeded. */
const RATE_LIMIT_CODE = 'resource-exhausted';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;
/** Longer base delay for rate-limit errors: quota windows are typically 1 s. */
const RATE_LIMIT_BASE_DELAY_MS = 1000;
/** Random jitter ceiling added to each delay to avoid thundering-herd retries. */
const MAX_JITTER_MS = 200;

export interface FirestoreDocument {
  id: string;
  updatedAt: number;
  ownerId: string;
  [key: string]: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly ngZone = inject(NgZone);
  private readonly logger = inject(LoggerService);
  private readonly photoStorage = inject(PhotoStorageService);
  private readonly firebaseOptions = inject(FIREBASE_OPTIONS);

  private get isFirebaseConfigured(): boolean {
    return checkFirebaseOptions(this.firebaseOptions);
  }

  // Schema module loaded on demand; guaranteed resolved before any Firestore
  // snapshot arrives (auth + Firebase SDK load takes far longer than this import).
  private _schemasPromise?: Promise<Awaited<typeof import('../../shared/schemas/birthday.schema')>>;
  private loadSchemas() {
    return this._schemasPromise ??= import('../../shared/schemas/birthday.schema');
  }

  // Unsubscribe is just () => void in Firebase — no runtime import needed
  private birthdaysListener: (() => void) | null = null;
  private categoriesListener: (() => void) | null = null;

  private birthdaysSubject = new BehaviorSubject<Birthday[]>([]);
  private categoriesSubject = new BehaviorSubject<Category[]>([]);

  readonly birthdays$ = this.birthdaysSubject.asObservable();
  readonly categories$ = this.categoriesSubject.asObservable();

  // Exposed for testing — production uses real setTimeout delay.
  /** @internal */
  protected delayMs(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Exposed for testing — production uses Math.random.
  /** @internal */
  protected jitterMs(): number {
    return Math.floor(Math.random() * MAX_JITTER_MS);
  }

  private isRetryable(error: unknown): boolean {
    if (error != null && typeof error === 'object' && 'code' in error) {
      const code = String((error as { code: unknown }).code);
      // Firebase codes may be namespaced: 'firestore/unavailable' → 'unavailable'
      const bare = code.includes('/') ? code.split('/').pop()! : code;
      return RETRYABLE_CODES.has(bare);
    }
    return false;
  }

  private isRateLimited(error: unknown): boolean {
    if (error != null && typeof error === 'object' && 'code' in error) {
      const code = String((error as { code: unknown }).code);
      const bare = code.includes('/') ? code.split('/').pop()! : code;
      return bare === RATE_LIMIT_CODE;
    }
    return false;
  }

  /**
   * Runs `fn`, retrying up to MAX_RETRIES times with exponential backoff when
   * the error is a transient Firestore error (unavailable, deadline-exceeded,
   * internal) or a rate-limit error (resource-exhausted).
   * Rate-limit errors use a longer base delay + random jitter to avoid
   * thundering-herd bursts after quota recovery.
   * Non-retryable errors are propagated immediately.
   */
  private async withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt < MAX_RETRIES && this.isRetryable(error)) {
          const base = this.isRateLimited(error) ? RATE_LIMIT_BASE_DELAY_MS : BASE_DELAY_MS;
          const delay = base * Math.pow(2, attempt) + this.jitterMs();
          this.logger.warn(
            `[Firestore] ${label} attempt ${attempt + 1} failed (retryable), retrying in ${delay}ms`,
            error
          );
          await this.delayMs(delay);
        } else {
          throw error;
        }
      }
    }
    /* istanbul ignore next */
    throw new Error('[Firestore] withRetry: unreachable');
  }

  private getUserPath(userId: string): string {
    return `users/${userId}`;
  }

  /**
   * Appends a {lastWrite: serverTimestamp()} write to the rate-limit tracker doc.
   * Must be called on every batch that mutates user data so that the Firestore
   * security rules' notTooFrequent() check has a document to read.
   */
  private addRateLimitToBatch(
    batch: WriteBatch,
    userId: string,
    fs: typeof import('firebase/firestore'),
    db: ReturnType<typeof firebaseGetters.getFirebaseFirestore>
  ): void {
    if (!db) return;
    const rateLimitRef = fs.doc(db, this.getUserPath(userId), 'rateLimit', 'writes');
    batch.set(rateLimitRef, { lastWrite: fs.serverTimestamp() });
  }

  getBirthdays(userId: string): Observable<Birthday[]> {
    if (!isPlatformBrowser(this.platformId) || !this.isFirebaseConfigured) {
      return of([]);
    }
    return from(this.fetchBirthdays(userId));
  }

  private async fetchBirthdays(userId: string): Promise<Birthday[]> {
    const db = firebaseGetters.getFirebaseFirestore();
    const fs = firebaseGetters.getFirestoreModule();
    if (!db || !fs) return [];

    const schemas = await this.loadSchemas();
    try {
      const raw = await this.withRetry(async () => {
        const snapshot = await fs.getDocs(fs.collection(db, this.getUserPath(userId), 'birthdays'));
        return this.mapBirthdaysFromSnapshot(snapshot, fs, schemas);
      }, 'fetch birthdays');
      return this.resolvePhotoUrls(raw);
    } catch (error) {
      this.logger.error('[Firestore] Failed to fetch birthdays:', error);
      throw error;
    }
  }

  subscribeToBirthdays(userId: string): void {
    if (!isPlatformBrowser(this.platformId) || !this.isFirebaseConfigured) return;
    this.unsubscribeFromBirthdays();

    const db = firebaseGetters.getFirebaseFirestore();
    const fs = firebaseGetters.getFirestoreModule();
    if (!db || !fs) return;

    // Schema loads before the first snapshot can arrive (Firebase SDK + auth take longer)
    this.loadSchemas().then(schemas => {
      this.birthdaysListener = fs.onSnapshot(
        fs.collection(db, this.getUserPath(userId), 'birthdays'),
        (snapshot) => {
          const raw = this.mapBirthdaysFromSnapshot(snapshot, fs, schemas);
          void this.resolvePhotoUrls(raw).then(birthdays => {
            this.ngZone.run(() => {
              this.birthdaysSubject.next(birthdays);
              this.logger.info('[Firestore] Birthdays updated:', birthdays.length);
            });
          });
        },
        (error) => {
          this.ngZone.run(() => {
            this.logger.error('[Firestore] Birthdays listener error:', error);
          });
        }
      );
    });
  }

  unsubscribeFromBirthdays(): void {
    if (this.birthdaysListener) {
      this.birthdaysListener();
      this.birthdaysListener = null;
    }
  }

  saveBirthday(userId: string, birthday: Birthday): Observable<void> {
    if (!isPlatformBrowser(this.platformId) || !this.isFirebaseConfigured) {
      return of(undefined);
    }
    return from(this.performSaveBirthday(userId, birthday));
  }

  private async performSaveBirthday(userId: string, birthday: Birthday): Promise<void> {
    const db = firebaseGetters.getFirebaseFirestore();
    const fs = firebaseGetters.getFirestoreModule();
    if (!db || !fs) return;

    try {
      await this.withRetry(async () => {
        const batch = fs.writeBatch(db);
        batch.set(
          fs.doc(db, this.getUserPath(userId), 'birthdays', birthday.id),
          this.mapBirthdayToFirestore(birthday, userId),
          { merge: true }
        );
        this.addRateLimitToBatch(batch, userId, fs, db);
        await batch.commit();
      }, 'save birthday');
      this.logger.info('[Firestore] Birthday saved:', birthday.id);
    } catch (error) {
      this.logger.error('[Firestore] Failed to save birthday:', error);
      throw error;
    }
  }

  deleteBirthday(userId: string, birthdayId: string): Observable<void> {
    if (!isPlatformBrowser(this.platformId) || !this.isFirebaseConfigured) {
      return of(undefined);
    }
    return from(this.performDeleteBirthday(userId, birthdayId));
  }

  private async performDeleteBirthday(userId: string, birthdayId: string): Promise<void> {
    const db = firebaseGetters.getFirebaseFirestore();
    const fs = firebaseGetters.getFirestoreModule();
    if (!db || !fs) return;

    try {
      await this.withRetry(async () => {
        const batch = fs.writeBatch(db);
        batch.delete(fs.doc(db, this.getUserPath(userId), 'birthdays', birthdayId));
        this.addRateLimitToBatch(batch, userId, fs, db);
        await batch.commit();
      }, 'delete birthday');
      this.logger.info('[Firestore] Birthday deleted:', birthdayId);
    } catch (error) {
      this.logger.error('[Firestore] Failed to delete birthday:', error);
      throw error;
    }
  }

  saveBirthdaysBatch(userId: string, birthdays: Birthday[]): Observable<void> {
    if (!isPlatformBrowser(this.platformId) || !this.isFirebaseConfigured) {
      return of(undefined);
    }
    return from(this.performBatchSave(userId, birthdays));
  }

  private async performBatchSave(userId: string, birthdays: Birthday[]): Promise<void> {
    const db = firebaseGetters.getFirebaseFirestore();
    const fs = firebaseGetters.getFirestoreModule();
    if (!db || !fs) return;

    try {
      await this.withRetry(async () => {
        const batch = fs.writeBatch(db);
        for (const birthday of birthdays) {
          batch.set(
            fs.doc(db, this.getUserPath(userId), 'birthdays', birthday.id),
            this.mapBirthdayToFirestore(birthday, userId),
            { merge: true }
          );
        }
        this.addRateLimitToBatch(batch, userId, fs, db);
        await batch.commit();
      }, 'batch save birthdays');
      this.logger.info('[Firestore] Batch save completed:', birthdays.length);
    } catch (error) {
      this.logger.error('[Firestore] Batch save failed:', error);
      throw error;
    }
  }

  getCategories(userId: string): Observable<Category[]> {
    if (!isPlatformBrowser(this.platformId) || !this.isFirebaseConfigured) {
      return of([]);
    }
    return from(this.fetchCategories(userId));
  }

  private async fetchCategories(userId: string): Promise<Category[]> {
    const db = firebaseGetters.getFirebaseFirestore();
    const fs = firebaseGetters.getFirestoreModule();
    if (!db || !fs) return [];

    const schemas = await this.loadSchemas();
    try {
      return await this.withRetry(async () => {
        const snapshot = await fs.getDocs(fs.collection(db, this.getUserPath(userId), 'categories'));
        return this.mapCategoriesFromSnapshot(snapshot, schemas);
      }, 'fetch categories');
    } catch (error) {
      this.logger.error('[Firestore] Failed to fetch categories:', error);
      throw error;
    }
  }

  subscribeToCategories(userId: string): void {
    if (!isPlatformBrowser(this.platformId) || !this.isFirebaseConfigured) return;
    this.unsubscribeFromCategories();

    const db = firebaseGetters.getFirebaseFirestore();
    const fs = firebaseGetters.getFirestoreModule();
    if (!db || !fs) return;

    this.loadSchemas().then(schemas => {
      this.categoriesListener = fs.onSnapshot(
        fs.collection(db, this.getUserPath(userId), 'categories'),
        (snapshot) => {
          this.ngZone.run(() => {
            const categories = this.mapCategoriesFromSnapshot(snapshot, schemas);
            this.categoriesSubject.next(categories);
            this.logger.info('[Firestore] Categories updated:', categories.length);
          });
        },
        (error) => {
          this.ngZone.run(() => {
            this.logger.error('[Firestore] Categories listener error:', error);
          });
        }
      );
    });
  }

  unsubscribeFromCategories(): void {
    if (this.categoriesListener) {
      this.categoriesListener();
      this.categoriesListener = null;
    }
  }

  saveCategory(userId: string, category: Category): Observable<void> {
    if (!isPlatformBrowser(this.platformId) || !this.isFirebaseConfigured) {
      return of(undefined);
    }
    return from(this.performSaveCategory(userId, category));
  }

  private async performSaveCategory(userId: string, category: Category): Promise<void> {
    const db = firebaseGetters.getFirebaseFirestore();
    const fs = firebaseGetters.getFirestoreModule();
    if (!db || !fs) return;

    try {
      await this.withRetry(async () => {
        const batch = fs.writeBatch(db);
        batch.set(
          fs.doc(db, this.getUserPath(userId), 'categories', category.id),
          { ...category, ownerId: userId, updatedAt: Date.now(), syncStatus: 'synced' },
          { merge: true }
        );
        this.addRateLimitToBatch(batch, userId, fs, db);
        await batch.commit();
      }, 'save category');
      this.logger.info('[Firestore] Category saved:', category.id);
    } catch (error) {
      this.logger.error('[Firestore] Failed to save category:', error);
      throw error;
    }
  }

  deleteCategory(userId: string, categoryId: string): Observable<void> {
    if (!isPlatformBrowser(this.platformId) || !this.isFirebaseConfigured) {
      return of(undefined);
    }
    return from(this.performDeleteCategory(userId, categoryId));
  }

  private async performDeleteCategory(userId: string, categoryId: string): Promise<void> {
    const db = firebaseGetters.getFirebaseFirestore();
    const fs = firebaseGetters.getFirestoreModule();
    if (!db || !fs) return;

    try {
      await this.withRetry(async () => {
        const batch = fs.writeBatch(db);
        batch.delete(fs.doc(db, this.getUserPath(userId), 'categories', categoryId));
        this.addRateLimitToBatch(batch, userId, fs, db);
        await batch.commit();
      }, 'delete category');
      this.logger.info('[Firestore] Category deleted:', categoryId);
    } catch (error) {
      this.logger.error('[Firestore] Failed to delete category:', error);
      throw error;
    }
  }

  /** Converts a Firestore Timestamp to milliseconds; returns any other value unchanged. */
  private mapTimestamp(v: unknown): number | unknown {
    if (v != null && typeof v === 'object' &&
        typeof (v as { toMillis?: unknown }).toMillis === 'function') {
      return (v as { toMillis: () => number }).toMillis();
    }
    return v;
  }

  /** Returns a shallow copy of `obj` with all null-valued entries removed. */
  private stripNulls<T>(obj: Record<string, T>): Record<string, T> {
    return Object.fromEntries(
      Object.entries(obj).filter(([, v]) => v !== null)
    ) as Record<string, T>;
  }

  private mapBirthdaysFromSnapshot(
    snapshot: QuerySnapshot<DocumentData>,
    fs: typeof import('firebase/firestore'),
    schemas: Awaited<typeof import('../../shared/schemas/birthday.schema')>
  ): Birthday[] {
    const birthdays: Birthday[] = [];
    for (const document of snapshot.docs) {
      const data = document.data();
      const raw = this.stripNulls(data as Record<string, unknown>);
      const scheduledMessages = Array.isArray(raw['scheduledMessages'])
        ? raw['scheduledMessages'].map((msg: Record<string, unknown>) =>
            Object.fromEntries(
              Object.entries(this.stripNulls(msg))
                .map(([k, v]) => [k, this.mapTimestamp(v)])
            )
          )
        : undefined;
      const mapped = {
        ...raw,
        id: document.id,
        birthDate: data['birthDate'] instanceof fs.Timestamp
          ? toDateString(data['birthDate'].toDate())
          : toDateString(data['birthDate']),
        syncStatus: 'synced' as const,
        ...(scheduledMessages !== undefined && { scheduledMessages })
      };
      const result = schemas.safeParseBirthday(mapped);
      if (result.success) {
        birthdays.push(result.data);
      } else {
        this.logger.warn('[Firestore] Skipping invalid birthday document:', document.id, result.error.issues);
      }
    }
    return birthdays;
  }

  private mapCategoriesFromSnapshot(
    snapshot: QuerySnapshot<DocumentData>,
    schemas: Awaited<typeof import('../../shared/schemas/birthday.schema')>
  ): Category[] {
    const categories: Category[] = [];
    for (const document of snapshot.docs) {
      const data = document.data();
      const result = schemas.safeParseCategory({ ...data, id: document.id, syncStatus: 'synced' });
      if (result.success) {
        categories.push(result.data);
      } else {
        this.logger.warn('[Firestore] Skipping invalid category document:', document.id, result.error.issues);
      }
    }
    return categories;
  }

  private mapBirthdayToFirestore(
    birthday: Birthday,
    userId: string
  ): Record<string, unknown> {
    const { syncStatus: _removed, scheduledMessages: _msgs, ...rest } = birthday;

    const data: Record<string, unknown> = {
      ...rest,
      // Store birthDate as a plain 'YYYY-MM-DD' string (no Timestamp) to avoid
      // timezone-shift bugs: a Timestamp encodes local midnight as UTC, so reading
      // it back in a different timezone can shift the date by ±1 day.
      // The read path handles both strings and legacy Timestamps for backward compat.
      birthDate: birthday.birthDate,
      ownerId: userId,
      updatedAt: Date.now()
    };

    // Firestore documents have a hard 1 MB limit. Never write base64-encoded photos.
    // For Firebase Storage CDN URLs, store the Storage path instead of the capability
    // URL — getDownloadURL() enforces Security Rules at call time, so paths stored in
    // Firestore cannot be used to access photos without owner authentication.
    for (const field of ['photo', 'rememberPhoto']) {
      const val = data[field];
      if (typeof val === 'string') {
        if (val.startsWith('data:')) {
          delete data[field];
        } else if (this.photoStorage.isStorageUrl(val)) {
          const path = this.photoStorage.extractPath(val);
          if (path) {
            data[field] = path;
          } else {
            delete data[field];
          }
        }
      }
    }

    for (const key of Object.keys(data)) {
      if (data[key] === undefined) {
        delete data[key];
      }
    }

    return data;
  }

  /**
   * Resolves Storage paths in photo fields to download URLs.
   * Called after reading from Firestore so that IndexedDB always stores usable URLs.
   * Fields that are already download URLs or base64 blobs are passed through unchanged
   * (backwards-compatible with legacy documents that stored capability URLs).
   */
  private async resolvePhotoUrls(birthdays: Birthday[]): Promise<Birthday[]> {
    return Promise.all(birthdays.map(async (b) => {
      const photo = b.photo ? await this.resolvePhotoField(b.photo) : b.photo;
      const rememberPhoto = b.rememberPhoto
        ? await this.resolvePhotoField(b.rememberPhoto)
        : b.rememberPhoto;
      return { ...b, photo, rememberPhoto };
    }));
  }

  private async resolvePhotoField(value: string): Promise<string> {
    if (
      this.photoStorage.isStorageUrl(value) ||
      this.photoStorage.isBase64(value) ||
      value.startsWith('https://') ||
      value.startsWith('http://')
    ) {
      return value;
    }
    // Treat as a Storage path — resolve via getDownloadURL (enforces owner auth rule)
    const url = await this.photoStorage.resolveUrl(value);
    if (!url) this.logger.warn('[Firestore] Could not resolve Storage path to URL:', value);
    return url ?? value;
  }

  /**
   * One-time migration: rewrites Firestore birthday documents that still store
   * Firebase Storage capability URLs (with ?token=...) as plain Storage paths.
   *
   * Safe to call on every sign-in — becomes a no-op once all documents are migrated.
   * Errors are logged and swallowed so a migration failure never blocks the app.
   */
  async migrateCapabilityUrls(userId: string): Promise<void> {
    if (!this.isFirebaseConfigured) return;

    const db = firebaseGetters.getFirebaseFirestore();
    const fs = firebaseGetters.getFirestoreModule();
    if (!db || !fs) return;

    const schemas = await this.loadSchemas();

    try {
      const snapshot = await fs.getDocs(fs.collection(db, this.getUserPath(userId), 'birthdays'));
      const birthdays = this.mapBirthdaysFromSnapshot(snapshot, fs, schemas);

      const toMigrate = birthdays.filter(b =>
        (b.photo && this.photoStorage.isStorageUrl(b.photo)) ||
        (b.rememberPhoto && this.photoStorage.isStorageUrl(b.rememberPhoto))
      );

      if (toMigrate.length === 0) {
        this.logger.info('[Firestore] Photo URL migration: already up to date');
        return;
      }

      await this.performBatchSave(userId, toMigrate);
      this.logger.info(`[Firestore] Photo URL migration: migrated ${toMigrate.length} document(s)`);
    } catch (error) {
      this.logger.warn('[Firestore] Photo URL migration failed:', error);
    }
  }

  unsubscribeAll(): void {
    this.unsubscribeFromBirthdays();
    this.unsubscribeFromCategories();
  }
}
