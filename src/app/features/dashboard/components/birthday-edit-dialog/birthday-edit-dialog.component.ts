import { Component, ChangeDetectionStrategy, HostListener, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
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
        FormsModule,
        ReactiveFormsModule,
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
  dialogRef = inject<MatDialogRef<BirthdayEditDialogComponent>>(MatDialogRef);
  data = inject<BirthdayEditDialogData>(MAT_DIALOG_DATA);

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
  };

  readonly contactForm: FormGroup<{
    email: FormControl<string>;
    phone: FormControl<string>;
    telegramUsername: FormControl<string>;
  }>;

  /** Pending File for the profile photo — uploaded on save. */
  private photoFile: File | null = null;
  /** Pending File for the remember photo — uploaded on save. */
  private rememberPhotoFile: File | null = null;

  constructor() {
    const data = this.data;

    this.editedBirthday = { ...data.birthday };
    this.editingData = {
      name: data.birthday.name,
      notes: data.birthday.notes || '',
      birthDate: data.birthday.birthDate,
      category: data.birthday.category || '',
      photo: data.birthday.photo || null,
      rememberPhoto: data.birthday.rememberPhoto || null,
    };

    this.contactForm = new FormGroup({
      email: new FormControl(data.birthday.email || '', {
        nonNullable: true,
        validators: [Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)],
      }),
      phone: new FormControl(data.birthday.phone || '', {
        nonNullable: true,
        validators: [Validators.pattern(/^\+?[\d\s\-()]*$/)],
      }),
      telegramUsername: new FormControl(data.birthday.telegramUsername || '', {
        nonNullable: true,
        validators: [Validators.pattern(/^[a-zA-Z][a-zA-Z0-9_]{4,31}$/)],
      }),
    });

    this.contactWarning = !this.hasAnyContact();
    this.contactForm.valueChanges.subscribe(() => {
      this.contactWarning = !this.hasAnyContact();
    });
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

  hasAnyContact(): boolean {
    const { email, phone, telegramUsername } = this.contactForm.getRawValue();
    return !!(email.trim() || phone.trim() || telegramUsername.trim());
  }

  isEmailValid(): boolean {
    return this.contactForm.get('email')!.valid;
  }

  isPhoneValid(): boolean {
    return this.contactForm.get('phone')!.valid;
  }

  isTelegramValid(): boolean {
    return this.contactForm.get('telegramUsername')!.valid;
  }

  isContactValid(): boolean {
    return this.contactForm.valid;
  }

  onContactChange(): void {
    this.contactWarning = !this.hasAnyContact();
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  async onSave(): Promise<void> {
    if (!this.contactForm.valid || this.isSaving) return;

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

      const contactValues = this.contactForm.getRawValue();
      const result: BirthdayEditDialogResult = {
        birthday: this.data.birthday,
        editedData: {
          ...this.editingData,
          email: contactValues.email,
          phone: contactValues.phone,
          telegramUsername: contactValues.telegramUsername,
        },
      };
      this.dialogRef.close(result);
    } finally {
      this.isSaving = false;
    }
  }
}
