import { Component, ChangeDetectionStrategy, inject } from '@angular/core';

import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import { BirthdayCategory } from '../../../../shared';

export interface CategoryReassignDialogData {
  categoryToDelete: BirthdayCategory;
  affectedBirthdaysCount: number;
  availableCategories: BirthdayCategory[];
  mode?: 'delete' | 'reassign-only';
}

@Component({
    selector: 'app-category-reassign-dialog',
    imports: [
        FormsModule,
        MatDialogModule,
        MatIconModule,
        MatFormFieldModule,
        MatSelectModule,
        MatButtonModule,
        TranslatePipe
    ],
    templateUrl: './category-reassign-dialog.component.html',
    styleUrls: ['./category-reassign-dialog.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryReassignDialogComponent {
  private dialogRef = inject<MatDialogRef<CategoryReassignDialogComponent>>(MatDialogRef);
  data = inject<CategoryReassignDialogData>(MAT_DIALOG_DATA);

  availableCategories: BirthdayCategory[] = [];
  selectedCategoryId: string | null = null;
  isReassignOnly = false;

  constructor() {
    this.isReassignOnly = this.data.mode === 'reassign-only';

    // Use categories passed from dialog data (from NgRx store)
    this.availableCategories = this.data.availableCategories
      .filter(cat => cat.id !== this.data.categoryToDelete.id);

    // Set default selection to the first available category
    if (this.availableCategories.length > 0) {
      this.selectedCategoryId = this.availableCategories[0].id;
    }
  }

  onConfirm(): void {
    this.dialogRef.close({
      action: 'reassign',
      newCategoryId: this.selectedCategoryId
    });
  }

  onDeleteWithoutReassign(): void {
    this.dialogRef.close({
      action: 'delete-orphan',
      newCategoryId: null
    });
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  trackByCategory(_index: number, category: BirthdayCategory): string {
    return category.id;
  }
}
