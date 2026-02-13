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
      birthDate: this.formatDateForInput(data.birthday.birthDate),
      category: data.birthday.category || '',
      photo: data.birthday.photo || null,
      rememberPhoto: data.birthday.rememberPhoto || null,
      email: data.birthday.email || '',
      phone: data.birthday.phone || '',
      telegramUsername: data.birthday.telegramUsername || '',
    };
  }

  @HostListener('window:keydown.escape')
  handleEscapeKey(): void {
    this.onCancel();
  }

  private formatDateForInput(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

  hasAnyContact(): boolean {
    return !!(this.editingData.email.trim() || this.editingData.phone.trim() || this.editingData.telegramUsername.trim());
  }

  onContactChange(): void {
    if (this.contactWarning && this.hasAnyContact()) {
      this.contactWarning = false;
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    const hasContact = !!(this.editingData.email.trim() || this.editingData.phone.trim() || this.editingData.telegramUsername.trim());
    if (!hasContact) {
      this.contactWarning = true;
      return;
    }
    this.contactWarning = false;
    const result: BirthdayEditDialogResult = {
      birthday: this.data.birthday,
      editedData: this.editingData
    };
    this.dialogRef.close(result);
  }
}
