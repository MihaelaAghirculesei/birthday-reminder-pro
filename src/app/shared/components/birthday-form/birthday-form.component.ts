import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { PhotoUploadComponent } from '../photo-upload.component';
import { DEFAULT_CATEGORY, BirthdayCategory } from '../../constants';
import { Birthday } from '../../models';
import { getZodiacSign, parseLocalDate, toDateString } from '../../utils';
import { BirthdaySchema, sanitizeBirthdayData } from '../../schemas/birthday.schema';
import { LoggerService } from '../../../core';
import { PhotoStorageService } from '../../../core/services/photo-storage.service';
import { FirebaseAuthService } from '../../../core/services/firebase-auth.service';

@Component({
  selector: 'app-birthday-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatIconModule,
    MatButtonModule,
    PhotoUploadComponent,
    TranslatePipe,
  ],
  templateUrl: './birthday-form.component.html',
  styleUrls: ['./birthday-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BirthdayFormComponent {
  @Input() categories: BirthdayCategory[] = [];
  @Output() birthdaySubmitted = new EventEmitter<Omit<Birthday, 'id'>>();

  private readonly fb = inject(FormBuilder);
  private readonly logger = inject(LoggerService);
  private readonly photoStorage = inject(PhotoStorageService);
  private readonly authService = inject(FirebaseAuthService);

  birthdayForm: FormGroup;
  /** Base64 preview shown in the component while upload is in progress. */
  selectedPhoto: string | null = null;
  /** Raw File reference held for upload to Firebase Storage on submit. */
  private selectedFile: File | null = null;
  /** Prevents double-submit during async photo upload. */
  readonly isSubmitting = signal(false);

  constructor() {
    this.birthdayForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      birthDate: ['', [Validators.required, this.pastDateValidator]],
      category: [DEFAULT_CATEGORY, Validators.required],
      notes: ['', Validators.maxLength(500)],
      reminderDays: [7, [Validators.min(1), Validators.max(365)]],
      photo: [null],
    });
  }

  async onSubmit(): Promise<void> {
    if (!this.birthdayForm.valid || this.isSubmitting()) return;

    this.isSubmitting.set(true);

    try {
      const birthDate = toDateString(this.birthdayForm.value.birthDate);
      const zodiacSign = getZodiacSign(birthDate);

      // Resolve the final photo value: CDN URL if authenticated, base64 fallback otherwise.
      let resolvedPhoto: string | null | undefined = this.selectedPhoto;
      if (this.selectedFile) {
        const userId = this.authService.currentUser?.uid;
        if (userId) {
          resolvedPhoto = await this.photoStorage.uploadPhoto(this.selectedFile, userId, 'photo');
        }
        // Anonymous users: selectedPhoto already holds the base64 preview — use it as-is.
      }

      const formData = sanitizeBirthdayData({
        ...this.birthdayForm.value,
        birthDate,
        photo: resolvedPhoto,
        zodiacSign: zodiacSign.name,
      });

      const formSchema = BirthdaySchema.omit({ id: true });
      const result = formSchema.safeParse(formData);

      if (!result.success) {
        this.logger.error('[BirthdayForm] Form data validation failed:', result.error.issues);
        return;
      }

      this.birthdaySubmitted.emit(formData as Omit<Birthday, 'id'>);
      this.birthdayForm.reset({ reminderDays: 7, category: DEFAULT_CATEGORY });
      this.selectedPhoto = null;
      this.selectedFile = null;
    } finally {
      this.isSubmitting.set(false);
    }
  }

  /** Called when PhotoUploadComponent emits the raw File (before FileReader). */
  onFileSelected(file: File): void {
    this.selectedFile = file;
  }

  /** Called when PhotoUploadComponent emits the base64 preview (after FileReader). */
  onPhotoSelected(photo: string): void {
    this.selectedPhoto = photo;
    this.birthdayForm.patchValue({ photo });
  }

  onPhotoRemoved(): void {
    this.selectedPhoto = null;
    this.selectedFile = null;
    this.birthdayForm.patchValue({ photo: null });
  }

  trackByCategory(_index: number, category: BirthdayCategory): string {
    return category.id;
  }

  private pastDateValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;

    const value = control.value;
    // Use parseLocalDate for YYYY-MM-DD strings: `new Date('YYYY-MM-DD')` is treated
    // as UTC midnight by the spec, causing off-by-one errors in UTC-negative zones.
    const selectedDate =
      value instanceof Date
        ? new Date(value.getFullYear(), value.getMonth(), value.getDate())
        : parseLocalDate(String(value));
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (selectedDate > today) {
      return { futureDate: true };
    }

    return null;
  }
}
