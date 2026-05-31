import { ChangeDetectionStrategy, Component, EventEmitter, inject,Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { CategoryIconComponent } from '../../../../shared';

export interface CategoryStats {
  id: string;
  name: string;
  nameKey?: string;
  icon: string;
  color: string;
  count: number;
}

@Component({
    selector: 'app-category-filter',
    imports: [MatIconModule, MatButtonModule, MatTooltipModule, TranslatePipe, CategoryIconComponent],
    templateUrl: './category-filter.component.html',
    styleUrls: ['./category-filter.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryFilterComponent {
  private translateService = inject(TranslateService);

  @Input() categoriesStats: CategoryStats[] = [];
  @Input() selectedCategory: string | null = null;

  @Output() categorySelected = new EventEmitter<string>();
  @Output() filterCleared = new EventEmitter<void>();
  @Output() addCategoryClicked = new EventEmitter<void>();
  @Output() editCategoryClicked = new EventEmitter<string>();
  @Output() deleteCategoryClicked = new EventEmitter<string>();

  selectCategory(categoryId: string): void {
    this.categorySelected.emit(categoryId);
  }

  clearFilter(): void {
    this.filterCleared.emit();
  }

  addNewCategory(): void {
    this.addCategoryClicked.emit();
  }

  editCategory(event: Event, categoryId: string): void {
    event.stopPropagation();
    this.editCategoryClicked.emit(categoryId);
  }

  deleteCategory(event: Event, categoryId: string): void {
    event.stopPropagation();
    this.deleteCategoryClicked.emit(categoryId);
  }

  getCategoryAriaLabel(categoryStats: CategoryStats): string {
    const personKey = categoryStats.count === 1 ? 'CATEGORY_FILTER.PERSON' : 'CATEGORY_FILTER.PEOPLE';
    return this.translateService.instant('CATEGORY_FILTER.FILTER_BY_ARIA', {
      name: categoryStats.name,
      count: categoryStats.count,
      people: this.translateService.instant(personKey),
    });
  }

  trackByCategoryStats(_index: number, categoryStats: CategoryStats): string {
    return categoryStats.id;
  }
}
