import { Component, Inject, ChangeDetectionStrategy, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { Birthday, BirthdayCategory, PhotoUploadComponent, MessageSchedulerComponent } from '../../../../shared';
import { PhotoStorageService } from '../../../../core/services/photo-storage.service';
import { FirebaseAuthService } from '../../../../core/services/firebase-auth.service';

export interface BirthdayEditDialogData {
  birthday: Birthday;
  categories: BirthdayCategory[];
}

export interface BirthdayEditDialogResult {
  birthday: Birthday;
  editedData: {
    name: string;
    notes: string;
    birthDate: string;
    category: string;
    photo: string | null;
    rememberPhoto: string | null;
    email: string;
    phone: string;
    telegramUsername: string;
  };
}

@Component({
    selector: 'app-birthday-edit-dialog',
    imports: [
        CommonModule,
        FormsModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        PhotoUploadComponent,
        MessageSchedulerComponent,
        TranslatePipe,
    ],
    templateUrl: './birthday-edit-dialog.component.html',
    styleUrls: ['./birthday-edit-dialog.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BirthdayEditDialogComponent {
  private readonly photoStorage = inject(PhotoStorageService);
  private readonly authService = inject(FirebaseAuthService);

  hasUnsavedMessages = false;
  isSaving = false;
  contactWarning = false;
  editedBirthday: Birthday;
  editingData: {
    name: string;
    notes: string;
    birthDate: string;
    category: string;
    photo: string | null;
    rememberPhoto: string | null;
    email: string;
    phone: string;
    telegramUsername: string;
  };

  /** Pending File for the profile photo — uploaded on save. */
  private photoFile: File | null = null;
  /** Pending File for the remember photo — uploaded on save. */
  private rememberPhotoFile: File | null = null;

  constructor(
    public dialogRef: MatDialogRef<BirthdayEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: BirthdayEditDialogData
  ) {
    this.editedBirthday = { ...data.birthday };
    this.editingData = {
      name: data.birthday.name,
      notes: data.birthday.notes || '',
      birthDate: data.birthday.birthDate,
      category: data.birthday.category || '',
      photo: data.birthday.photo || null,
      rememberPhoto: data.birthday.rememberPhoto || null,
      email: data.birthday.email || '',
      phone: data.birthday.phone || '',
      telegramUsername: data.birthday.telegramUsername || '',
    };
    this.contactWarning = !this.hasAnyContact();
  }

  @HostListener('window:keydown.escape')
  handleEscapeKey(): void {
    if (!this.isSaving) this.onCancel();
  }

  /** Stores the raw File for upload; base64 preview is handled by photoSelected. */
  onPhotoFileSelected(file: File): void {
    this.photoFile = file;
  }

  /** Updates the preview shown while the photo hasn't been uploaded yet. */
  onPhotoSelected(photoDataUrl: string): void {
    this.editingData.photo = photoDataUrl;
  }

  onPhotoRemoved(): void {
    this.photoFile = null;
    this.editingData.photo = null;
  }

  onRememberPhotoFileSelected(file: File): void {
    this.rememberPhotoFile = file;
  }

  onRememberPhotoSelected(photoDataUrl: string): void {
    this.editingData.rememberPhoto = photoDataUrl;
  }

  onRememberPhotoRemoved(): void {
    this.rememberPhotoFile = null;
    this.editingData.rememberPhoto = null;
  }

  onMessageUnsavedChanges(hasUnsaved: boolean): void {
    this.hasUnsavedMessages = hasUnsaved;
  }

  private phonePattern = /^\+?[\d\s\-()]*$/;
  private emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  private telegramPattern = /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/;

  hasAnyContact(): boolean {
    return !!(this.editingData.email.trim() || this.editingData.phone.trim() || this.editingData.telegramUsername.trim());
  }

  isEmailValid(): boolean {
    return !this.editingData.email.trim() || this.emailPattern.test(this.editingData.email);
  }

  isPhoneValid(): boolean {
    return !this.editingData.phone.trim() || this.phonePattern.test(this.editingData.phone);
  }

  isTelegramValid(): boolean {
    return !this.editingData.telegramUsername.trim() || this.telegramPattern.test(this.editingData.telegramUsername);
  }

  isContactValid(): boolean {
    return this.isEmailValid() && this.isPhoneValid() && this.isTelegramValid();
  }

  onContactChange(): void {
    this.contactWarning = !this.hasAnyContact();
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  async onSave(): Promise<void> {
    if (!this.isContactValid() || this.isSaving) return;

    this.isSaving = true;

    try {
      const userId = this.authService.currentUser?.uid;

      // Upload pending files to Firebase Storage (no-op for anonymous users: returns base64).
      if (this.photoFile) {
        this.editingData.photo = userId
          ? await this.photoStorage.uploadPhoto(this.photoFile, userId, 'photo')
          : await this.photoStorage.fileToBase64(this.photoFile);
        this.photoFile = null;
      }

      if (this.rememberPhotoFile) {
        this.editingData.rememberPhoto = userId
          ? await this.photoStorage.uploadPhoto(this.rememberPhotoFile, userId, 'rememberPhoto')
          : await this.photoStorage.fileToBase64(this.rememberPhotoFile);
        this.rememberPhotoFile = null;
      }

      const result: BirthdayEditDialogResult = {
        birthday: this.data.birthday,
        editedData: { ...this.editingData },
      };
      this.dialogRef.close(result);
    } finally {
      this.isSaving = false;
    }
  }
}
