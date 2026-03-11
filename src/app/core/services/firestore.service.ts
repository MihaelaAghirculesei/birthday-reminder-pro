import { Injectable, inject, PLATFORM_ID, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  Timestamp,
  Unsubscribe,
  DocumentData,
  QuerySnapshot
} from 'firebase/firestore';
import { Observable, Subject, from, of } from 'rxjs';
import { getFirebaseFirestore, isFirebaseConfigured } from '../../firebase.config';
import { LoggerService } from './logger.service';
import { Birthday, Category } from '../../shared/models/birthday.model';
import { safeParseBirthday, safeParseCategory } from '../../shared/schemas/birthday.schema';

export interface FirestoreDocument {
  id: string;
  updatedAt: number;
  ownerId: string;
  [key: string]: unknown;
}

interface StoredBirthday extends Omit<Birthday, 'birthDate'> {
  birthDate: Timestamp;
}

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly ngZone = inject(NgZone);
  private readonly logger = inject(LoggerService);

  private birthdaysListener: Unsubscribe | null = null;
  private categoriesListener: Unsubscribe | null = null;

  private birthdaysSubject = new Subject<Birthday[]>();
  private categoriesSubject = new Subject<Category[]>();

  readonly birthdays$ = this.birthdaysSubject.asObservable();
  readonly categories$ = this.categoriesSubject.asObservable();

  private getUserPath(userId: string): string {
    return `users/${userId}`;
  }

  // ============ BIRTHDAYS ============

  getBirthdays(userId: string): Observable<Birthday[]> {
    if (!isPlatformBrowser(this.platformId) || !isFirebaseConfigured()) {
      return of([]);
    }

    return from(this.fetchBirthdays(userId));
  }

  private async fetchBirthdays(userId: string): Promise<Birthday[]> {
    const db = getFirebaseFirestore();
    if (!db) return [];

    const birthdaysRef = collection(db, this.getUserPath(userId), 'birthdays');

    try {
      const snapshot = await getDocs(birthdaysRef);
      return this.mapBirthdaysFromSnapshot(snapshot);
    } catch (error) {
      this.logger.error('[Firestore] Failed to fetch birthdays:', error);
      throw error;
    }
  }

  subscribeToBirthdays(userId: string): void {
    if (!isPlatformBrowser(this.platformId) || !isFirebaseConfigured()) return;

    this.unsubscribeFromBirthdays();

    const db = getFirebaseFirestore();
    if (!db) return;

    const birthdaysRef = collection(db, this.getUserPath(userId), 'birthdays');

    this.birthdaysListener = onSnapshot(
      birthdaysRef,
      (snapshot) => {
        this.ngZone.run(() => {
          const birthdays = this.mapBirthdaysFromSnapshot(snapshot);
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
    if (!isPlatformBrowser(this.platformId) || !isFirebaseConfigured()) {
      return of(undefined);
    }

    return from(this.performSaveBirthday(userId, birthday));
  }

  private async performSaveBirthday(userId: string, birthday: Birthday): Promise<void> {
    const db = getFirebaseFirestore();
    if (!db) return;

    const docRef = doc(db, this.getUserPath(userId), 'birthdays', birthday.id);

    const data = this.mapBirthdayToFirestore(birthday, userId);

    try {
      await setDoc(docRef, data, { merge: true });
      this.logger.info('[Firestore] Birthday saved:', birthday.id);
    } catch (error) {
      this.logger.error('[Firestore] Failed to save birthday:', error);
      throw error;
    }
  }

  deleteBirthday(userId: string, birthdayId: string): Observable<void> {
    if (!isPlatformBrowser(this.platformId) || !isFirebaseConfigured()) {
      return of(undefined);
    }

    return from(this.performDeleteBirthday(userId, birthdayId));
  }

  private async performDeleteBirthday(userId: string, birthdayId: string): Promise<void> {
    const db = getFirebaseFirestore();
    if (!db) return;

    const docRef = doc(db, this.getUserPath(userId), 'birthdays', birthdayId);

    try {
      await deleteDoc(docRef);
      this.logger.info('[Firestore] Birthday deleted:', birthdayId);
    } catch (error) {
      this.logger.error('[Firestore] Failed to delete birthday:', error);
      throw error;
    }
  }

  saveBirthdaysBatch(userId: string, birthdays: Birthday[]): Observable<void> {
    if (!isPlatformBrowser(this.platformId) || !isFirebaseConfigured()) {
      return of(undefined);
    }

    return from(this.performBatchSave(userId, birthdays));
  }

  private async performBatchSave(userId: string, birthdays: Birthday[]): Promise<void> {
    const db = getFirebaseFirestore();
    if (!db) return;

    const batch = writeBatch(db);

    for (const birthday of birthdays) {
      const docRef = doc(db, this.getUserPath(userId), 'birthdays', birthday.id);
      const data = this.mapBirthdayToFirestore(birthday, userId);
      batch.set(docRef, data, { merge: true });
    }

    try {
      await batch.commit();
      this.logger.info('[Firestore] Batch save completed:', birthdays.length);
    } catch (error) {
      this.logger.error('[Firestore] Batch save failed:', error);
      throw error;
    }
  }

  // ============ CATEGORIES ============

  getCategories(userId: string): Observable<Category[]> {
    if (!isPlatformBrowser(this.platformId) || !isFirebaseConfigured()) {
      return of([]);
    }

    return from(this.fetchCategories(userId));
  }

  private async fetchCategories(userId: string): Promise<Category[]> {
    const db = getFirebaseFirestore();
    if (!db) return [];

    const categoriesRef = collection(db, this.getUserPath(userId), 'categories');

    try {
      const snapshot = await getDocs(categoriesRef);
      return this.mapCategoriesFromSnapshot(snapshot);
    } catch (error) {
      this.logger.error('[Firestore] Failed to fetch categories:', error);
      throw error;
    }
  }

  subscribeToCategories(userId: string): void {
    if (!isPlatformBrowser(this.platformId) || !isFirebaseConfigured()) return;

    this.unsubscribeFromCategories();

    const db = getFirebaseFirestore();
    if (!db) return;

    const categoriesRef = collection(db, this.getUserPath(userId), 'categories');

    this.categoriesListener = onSnapshot(
      categoriesRef,
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
    if (!isPlatformBrowser(this.platformId) || !isFirebaseConfigured()) {
      return of(undefined);
    }

    return from(this.performSaveCategory(userId, category));
  }

  private async performSaveCategory(userId: string, category: Category): Promise<void> {
    const db = getFirebaseFirestore();
    if (!db) return;

    const docRef = doc(db, this.getUserPath(userId), 'categories', category.id);

    const data = {
      ...category,
      ownerId: userId,
      updatedAt: Date.now(),
      syncStatus: 'synced'
    };

    try {
      await setDoc(docRef, data, { merge: true });
      this.logger.info('[Firestore] Category saved:', category.id);
    } catch (error) {
      this.logger.error('[Firestore] Failed to save category:', error);
      throw error;
    }
  }

  deleteCategory(userId: string, categoryId: string): Observable<void> {
    if (!isPlatformBrowser(this.platformId) || !isFirebaseConfigured()) {
      return of(undefined);
    }

    return from(this.performDeleteCategory(userId, categoryId));
  }

  private async performDeleteCategory(userId: string, categoryId: string): Promise<void> {
    const db = getFirebaseFirestore();
    if (!db) return;

    const docRef = doc(db, this.getUserPath(userId), 'categories', categoryId);

    try {
      await deleteDoc(docRef);
      this.logger.info('[Firestore] Category deleted:', categoryId);
    } catch (error) {
      this.logger.error('[Firestore] Failed to delete category:', error);
      throw error;
    }
  }

  // ============ HELPERS ============

  private mapBirthdaysFromSnapshot(snapshot: QuerySnapshot<DocumentData>): Birthday[] {
    const birthdays: Birthday[] = [];
    for (const doc of snapshot.docs) {
      const data = doc.data() as StoredBirthday;
      const mapped = {
        ...data,
        id: doc.id,
        birthDate: data.birthDate instanceof Timestamp
          ? data.birthDate.toDate()
          : new Date(data.birthDate as unknown as string),
        syncStatus: 'synced' as const
      };
      const result = safeParseBirthday(mapped);
      if (result.success) {
        birthdays.push(mapped);
      } else {
        this.logger.warn('[Firestore] Skipping invalid birthday document:', doc.id, result.error.issues);
      }
    }
    return birthdays;
  }

  private mapCategoriesFromSnapshot(snapshot: QuerySnapshot<DocumentData>): Category[] {
    const categories: Category[] = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const mapped = {
        ...data,
        id: doc.id,
        syncStatus: 'synced'
      } as Category;
      const result = safeParseCategory(mapped);
      if (result.success) {
        categories.push(mapped);
      } else {
        this.logger.warn('[Firestore] Skipping invalid category document:', doc.id, result.error.issues);
      }
    }
    return categories;
  }

  private mapBirthdayToFirestore(birthday: Birthday, userId: string): Record<string, unknown> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { syncStatus: _removed, ...rest } = birthday;

    const data: Record<string, unknown> = {
      ...rest,
      birthDate: Timestamp.fromDate(
        birthday.birthDate instanceof Date
          ? birthday.birthDate
          : new Date(birthday.birthDate)
      ),
      ownerId: userId,
      updatedAt: Date.now()
    };

    // Firestore rejects undefined values
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
