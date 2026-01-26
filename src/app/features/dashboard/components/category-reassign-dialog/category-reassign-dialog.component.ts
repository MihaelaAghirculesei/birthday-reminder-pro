import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';

import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
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
        MatButtonModule
    ],
    templateUrl: './category-reassign-dialog.component.html',
    styleUrls: ['./category-reassign-dialog.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryReassignDialogComponent {
  availableCategories: BirthdayCategory[] = [];
  selectedCategoryId: string | null = null;
  isReassignOnly = false;

  constructor(
    private dialogRef: MatDialogRef<CategoryReassignDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CategoryReassignDialogData
  ) {
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
