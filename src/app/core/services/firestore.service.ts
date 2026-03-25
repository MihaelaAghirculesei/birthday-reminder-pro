import { Injectable, inject, PLATFORM_ID, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { DocumentData, QuerySnapshot, WriteBatch } from 'firebase/firestore';
import { Observable, Subject, from, of } from 'rxjs';
import { getFirebaseFirestore, getFirestoreModule, checkFirebaseOptions, FIREBASE_OPTIONS } from '../../firebase.config';
import { LoggerService } from './logger.service';
import { Birthday, Category } from '../../shared/models/birthday.model';
import { safeParseBirthday, safeParseCategory } from '../../shared/schemas/birthday.schema';
import { toDateString, parseLocalDate } from '../../shared/utils/date.utils';

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
  private readonly firebaseOptions = inject(FIREBASE_OPTIONS);

  private get isFirebaseConfigured(): boolean {
    return checkFirebaseOptions(this.firebaseOptions);
  }

  // Unsubscribe is just () => void in Firebase — no runtime import needed
  private birthdaysListener: (() => void) | null = null;
  private categoriesListener: (() => void) | null = null;

  private birthdaysSubject = new Subject<Birthday[]>();
  private categoriesSubject = new Subject<Category[]>();

  readonly birthdays$ = this.birthdaysSubject.asObservable();
  readonly categories$ = this.categoriesSubject.asObservable();

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
    db: ReturnType<typeof getFirebaseFirestore>
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
    const db = getFirebaseFirestore();
    const fs = getFirestoreModule();
    if (!db || !fs) return [];

    try {
      const snapshot = await fs.getDocs(fs.collection(db, this.getUserPath(userId), 'birthdays'));
      return this.mapBirthdaysFromSnapshot(snapshot, fs);
    } catch (error) {
      this.logger.error('[Firestore] Failed to fetch birthdays:', error);
      throw error;
    }
  }

  subscribeToBirthdays(userId: string): void {
    if (!isPlatformBrowser(this.platformId) || !this.isFirebaseConfigured) return;
    this.unsubscribeFromBirthdays();

    const db = getFirebaseFirestore();
    const fs = getFirestoreModule();
    if (!db || !fs) return;

    this.birthdaysListener = fs.onSnapshot(
      fs.collection(db, this.getUserPath(userId), 'birthdays'),
      (snapshot) => {
        this.ngZone.run(() => {
          const birthdays = this.mapBirthdaysFromSnapshot(snapshot, fs);
          this.birthdaysSubject.next(birthdays);
          this.logger.info('[Firestore] Birthdays updated:', birthdays.length);
        });
      },
      (error) => {
        this.ngZone.run(() => {
          this.logger.error('[Firestore] Birthdays listener error:', error);
        });
      }
    );
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
    const db = getFirebaseFirestore();
    const fs = getFirestoreModule();
    if (!db || !fs) return;

    const batch = fs.writeBatch(db);
    batch.set(
      fs.doc(db, this.getUserPath(userId), 'birthdays', birthday.id),
      this.mapBirthdayToFirestore(birthday, userId, fs),
      { merge: true }
    );
    this.addRateLimitToBatch(batch, userId, fs, db);

    try {
      await batch.commit();
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
    const db = getFirebaseFirestore();
    const fs = getFirestoreModule();
    if (!db || !fs) return;

    const batch = fs.writeBatch(db);
    batch.delete(fs.doc(db, this.getUserPath(userId), 'birthdays', birthdayId));
    this.addRateLimitToBatch(batch, userId, fs, db);

    try {
      await batch.commit();
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
    const db = getFirebaseFirestore();
    const fs = getFirestoreModule();
    if (!db || !fs) return;

    const batch = fs.writeBatch(db);
    for (const birthday of birthdays) {
      batch.set(
        fs.doc(db, this.getUserPath(userId), 'birthdays', birthday.id),
        this.mapBirthdayToFirestore(birthday, userId, fs),
        { merge: true }
      );
    }
    this.addRateLimitToBatch(batch, userId, fs, db);

    try {
      await batch.commit();
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
    const db = getFirebaseFirestore();
    const fs = getFirestoreModule();
    if (!db || !fs) return [];

    try {
      const snapshot = await fs.getDocs(fs.collection(db, this.getUserPath(userId), 'categories'));
      return this.mapCategoriesFromSnapshot(snapshot);
    } catch (error) {
      this.logger.error('[Firestore] Failed to fetch categories:', error);
      throw error;
    }
  }

  subscribeToCategories(userId: string): void {
    if (!isPlatformBrowser(this.platformId) || !this.isFirebaseConfigured) return;
    this.unsubscribeFromCategories();

    const db = getFirebaseFirestore();
    const fs = getFirestoreModule();
    if (!db || !fs) return;

    this.categoriesListener = fs.onSnapshot(
      fs.collection(db, this.getUserPath(userId), 'categories'),
      (snapshot) => {
        this.ngZone.run(() => {
          const categories = this.mapCategoriesFromSnapshot(snapshot);
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
    const db = getFirebaseFirestore();
    const fs = getFirestoreModule();
    if (!db || !fs) return;

    const batch = fs.writeBatch(db);
    batch.set(
      fs.doc(db, this.getUserPath(userId), 'categories', category.id),
      { ...category, ownerId: userId, updatedAt: Date.now(), syncStatus: 'synced' },
      { merge: true }
    );
    this.addRateLimitToBatch(batch, userId, fs, db);

    try {
      await batch.commit();
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
    const db = getFirebaseFirestore();
    const fs = getFirestoreModule();
    if (!db || !fs) return;

    const batch = fs.writeBatch(db);
    batch.delete(fs.doc(db, this.getUserPath(userId), 'categories', categoryId));
    this.addRateLimitToBatch(batch, userId, fs, db);

    try {
      await batch.commit();
      this.logger.info('[Firestore] Category deleted:', categoryId);
    } catch (error) {
      this.logger.error('[Firestore] Failed to delete category:', error);
      throw error;
    }
  }

  private mapBirthdaysFromSnapshot(
    snapshot: QuerySnapshot<DocumentData>,
    fs: typeof import('firebase/firestore')
  ): Birthday[] {
    const birthdays: Birthday[] = [];
    for (const document of snapshot.docs) {
      const data = document.data();
      const raw = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== null)
      );
      const scheduledMessages = Array.isArray(raw['scheduledMessages'])
        ? raw['scheduledMessages'].map((msg: Record<string, unknown>) =>
            Object.fromEntries(
              Object.entries(msg)
                .filter(([, v]) => v !== null)
                .map(([k, v]) => [k, v instanceof fs.Timestamp ? v.toMillis() : v])
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
      const result = safeParseBirthday(mapped);
      if (result.success) {
        birthdays.push(result.data);
      } else {
        this.logger.warn('[Firestore] Skipping invalid birthday document:', document.id, result.error.issues);
      }
    }
    return birthdays;
  }

  private mapCategoriesFromSnapshot(snapshot: QuerySnapshot<DocumentData>): Category[] {
    const categories: Category[] = [];
    for (const document of snapshot.docs) {
      const data = document.data();
      const result = safeParseCategory({ ...data, id: document.id, syncStatus: 'synced' });
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
    userId: string,
    fs: typeof import('firebase/firestore')
  ): Record<string, unknown> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { syncStatus: _removed, scheduledMessages: _msgs, ...rest } = birthday;

    const data: Record<string, unknown> = {
      ...rest,
      birthDate: fs.Timestamp.fromDate(parseLocalDate(birthday.birthDate)),
      ownerId: userId,
      updatedAt: Date.now()
    };

    // Firestore documents have a hard 1 MB limit. Never write base64-encoded
    // photos (up to 7 MB) into a document. Only Firebase Storage CDN URLs are
    // persisted; base64 blobs are skipped so the existing Firestore value is
    // preserved via merge:true until the photo is re-uploaded to Storage.
    for (const field of ['photo', 'rememberPhoto']) {
      const val = data[field];
      if (typeof val === 'string' && val.startsWith('data:')) {
        delete data[field];
      }
    }

    for (const key of Object.keys(data)) {
      if (data[key] === undefined) {
        delete data[key];
      }
    }

    return data;
  }

  unsubscribeAll(): void {
    this.unsubscribeFromBirthdays();
    this.unsubscribeFromCategories();
  }
}
