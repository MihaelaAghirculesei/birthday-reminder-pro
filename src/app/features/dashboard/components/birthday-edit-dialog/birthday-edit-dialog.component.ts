import { Component, Inject, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Birthday, BirthdayCategory, PhotoUploadComponent, MessageSchedulerComponent } from '../../../../shared';

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
    ],
    templateUrl: './birthday-edit-dialog.component.html',
    styleUrls: ['./birthday-edit-dialog.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BirthdayEditDialogComponent {
  hasUnsavedMessages = false;
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
    this.onCancel();
  }

  onPhotoSelected(photoDataUrl: string): void {
    this.editingData.photo = photoDataUrl;
  }

  onPhotoRemoved(): void {
    this.editingData.photo = null;
  }

  onRememberPhotoSelected(photoDataUrl: string): void {
    this.editingData.rememberPhoto = photoDataUrl;
  }

  onRememberPhotoRemoved(): void {
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

  onSave(): void {
    if (!this.isContactValid()) {
      return;
    }
    const result: BirthdayEditDialogResult = {
      birthday: this.data.birthday,
      editedData: this.editingData
    };
    this.dialogRef.close(result);
  }
}
