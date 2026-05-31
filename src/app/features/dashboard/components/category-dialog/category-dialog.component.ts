import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, type FormGroup, ReactiveFormsModule,Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule,MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TranslatePipe } from '@ngx-translate/core';

import { LocaleService } from '../../../../core/services/locale.service';

interface CategoryDialogData {
  mode: 'add' | 'edit';
  category?: {
    id: string;
    name: string;
    icon: string;
    color: string;
    nameTranslations?: Record<string, string>;
  };
}

@Component({
    selector: 'app-category-dialog',
    imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule, MatTooltipModule, TranslatePipe],
    templateUrl: './category-dialog.component.html',
    styleUrls: ['./category-dialog.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<CategoryDialogComponent>>(MatDialogRef);
  data = inject<CategoryDialogData>(MAT_DIALOG_DATA);

  private readonly localeService = inject(LocaleService);

  categoryForm: FormGroup;

  readonly currentLang: string;
  readonly currentLangLabel: string;
  readonly otherLang: string;
  readonly otherLangLabel: string;

  availableIcons = [
    'favorite', 'star', 'pets', 'sports_soccer', 'school', 'work',
    'music_note', 'restaurant', 'local_cafe', 'flight', 'beach_access',
    'fitness_center', 'book', 'brush', 'camera', 'code', 'shopping_cart',
    'local_florist', 'celebration', 'cake', 'emoji_people', 'face'
  ];

  availableColors = [
    { name: 'Red', value: '#F44336' },
    { name: 'Pink', value: '#E91E63' },
    { name: 'Purple', value: '#9C27B0' },
    { name: 'Deep Purple', value: '#673AB7' },
    { name: 'Indigo', value: '#3F51B5' },
    { name: 'Blue', value: '#2196F3' },
    { name: 'Light Blue', value: '#03A9F4' },
    { name: 'Cyan', value: '#00BCD4' },
    { name: 'Teal', value: '#009688' },
    { name: 'Green', value: '#4CAF50' },
    { name: 'Light Green', value: '#8BC34A' },
    { name: 'Lime', value: '#CDDC39' },
    { name: 'Yellow', value: '#FFEB3B' },
    { name: 'Amber', value: '#FFC107' },
    { name: 'Orange', value: '#FF9800' },
    { name: 'Deep Orange', value: '#FF5722' }
  ];

  constructor() {
    const data = this.data;

    this.currentLang = this.localeService.currentLang;
    this.otherLang = this.currentLang === 'it' ? 'en' : 'it';
    this.currentLangLabel = this.currentLang === 'it' ? 'Italiano' : 'English';
    this.otherLangLabel = this.otherLang === 'en' ? 'English' : 'Italiano';

    const existingOtherName = data?.category?.nameTranslations?.[this.otherLang] || '';

    this.categoryForm = this.fb.group({
      name: [data?.category?.name || '', [Validators.required, Validators.minLength(2), Validators.maxLength(30)]],
      nameOtherLang: [existingOtherName, [Validators.maxLength(30)]],
      icon: [data?.category?.icon || 'star', Validators.required],
      color: [data?.category?.color || '#2196F3', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.categoryForm.valid) {
      this.dialogRef.close(this.categoryForm.value);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackByColorValue(_index: number, colorOption: { name: string; value: string }): string {
    return colorOption.value;
  }
}
