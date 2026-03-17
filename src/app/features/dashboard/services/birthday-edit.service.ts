import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { Birthday } from '../../../shared';

export interface EditingBirthdayData {
  name: string;
  notes: string;
  birthDate: string;
  category: string;
  photo: string | null;
  rememberPhoto: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class BirthdayEditService {
  private readonly destroyRef = inject(DestroyRef);

  private editingBirthdayIdSubject = new BehaviorSubject<string | null>(null);
  private editingBirthdayDataSubject = new BehaviorSubject<EditingBirthdayData | null>(null);
  private autoSave$ = new Subject<() => void>();

  editingBirthdayId$ = this.editingBirthdayIdSubject.asObservable();
  editingBirthdayData$ = this.editingBirthdayDataSubject.asObservable();

  constructor() {
    this.autoSave$.pipe(
      debounceTime(2000),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(callback => callback());
  }

  get currentEditingId(): string | null {
    return this.editingBirthdayIdSubject.value;
  }

  get currentEditingData(): EditingBirthdayData | null {
    return this.editingBirthdayDataSubject.value;
  }

  startEdit(birthday: Birthday, defaultCategory: string): void {
    if (this.editingBirthdayIdSubject.value && this.editingBirthdayIdSubject.value !== birthday.id) {
      this.cancelEdit();
    }

    this.editingBirthdayIdSubject.next(birthday.id);
    this.editingBirthdayDataSubject.next({
      name: birthday.name,
      notes: birthday.notes || '',
      birthDate: birthday.birthDate,
      category: birthday.category || defaultCategory,
      photo: birthday.photo || null,
      rememberPhoto: birthday.rememberPhoto || null,
    });
  }

  updateEditingData(data: Partial<EditingBirthdayData>): void {
    const currentData = this.editingBirthdayDataSubject.value;
    if (currentData) {
      this.editingBirthdayDataSubject.next({ ...currentData, ...data });
    }
  }

  cancelEdit(): void {
    this.editingBirthdayIdSubject.next(null);
    this.editingBirthdayDataSubject.next(null);
  }

  isEditing(birthdayId: string): boolean {
    return this.editingBirthdayIdSubject.value === birthdayId;
  }

  scheduleAutoSave(callback: () => void): void {
    this.autoSave$.next(callback);
  }
}
