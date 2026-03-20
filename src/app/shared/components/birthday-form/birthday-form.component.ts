import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
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
import { getZodiacSign } from '../../utils';
import { toDateString } from '../../utils/date.utils';
import { BirthdaySchema, sanitizeBirthdayData } from '../../schemas/birthday.schema';
import { LoggerService } from '../../../core';

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

  birthdayForm: FormGroup;
  selectedPhoto: string | null = null;

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

  onSubmit(): void {
    if (this.birthdayForm.valid) {
      const birthDate = toDateString(this.birthdayForm.value.birthDate);
      const zodiacSign = getZodiacSign(birthDate);

      const formData = sanitizeBirthdayData({
        ...this.birthdayForm.value,
        birthDate,
        photo: this.selectedPhoto,
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
    }
  }

  onPhotoSelected(photo: string): void {
    this.selectedPhoto = photo;
    this.birthdayForm.patchValue({ photo });
  }

  onPhotoRemoved(): void {
    this.selectedPhoto = null;
    this.birthdayForm.patchValue({ photo: null });
  }

  trackByCategory(_index: number, category: BirthdayCategory): string {
    return category.id;
  }

  private pastDateValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;

    const selectedDate = new Date(control.value);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (selectedDate > today) {
      return { futureDate: true };
    }

    return null;
  }
}
