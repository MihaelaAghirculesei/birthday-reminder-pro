import { ChangeDetectionStrategy,Component, Input, type OnChanges, type SimpleChanges } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TranslatePipe } from '@ngx-translate/core';

import { getCategoryById,getCategoryColor, getCategoryIcon } from '../constants/categories';

const CATEGORY_KEY_MAP: Record<string, string> = {
  family: 'CATEGORIES.FAMILY',
  friends: 'CATEGORIES.FRIENDS',
  colleagues: 'CATEGORIES.COLLEAGUES',
  romantic: 'CATEGORIES.ROMANTIC',
  acquaintances: 'CATEGORIES.ACQUAINTANCES',
  other: 'CATEGORIES.OTHER',
  gaming: 'CATEGORIES.GAMING'
};

@Component({
    selector: 'app-category-icon',
    imports: [MatIconModule, MatTooltipModule, TranslatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="category-icon-wrapper"
         [style.background-color]="iconColor"
         [matTooltip]="categoryTooltipKey | translate"
         [class]="cssClass"
         role="img"
         [attr.aria-label]="categoryTooltipKey | translate">
      <mat-icon aria-hidden="true" class="category-icon">
        {{ iconName }}
      </mat-icon>
    </div>
  `,
    styles: [`
    .category-icon-wrapper {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 55px;
      height: 55px;
      border-radius: 50%;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
      position: relative;

      &:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 12px rgba(0,0,0,0.25);
      }

      .category-icon {
        color: white !important;
        font-size: 28px !important;
        width: 28px !important;
        height: 28px !important;
        text-shadow: 0 2px 4px rgba(0,0,0,0.4);
      }
    }

    .dashboard-category-inline.category-icon-wrapper {
      width: 55px;
      height: 55px;

      .category-icon {
        font-size: 28px !important;
        width: 28px !important;
        height: 28px !important;
      }
    }

    .category-stat-icon.category-icon-wrapper {
      width: 40px;
      height: 40px;

      .category-icon {
        font-size: 24px !important;
        width: 24px !important;
        height: 24px !important;
      }
    }
  `]
})
export class CategoryIconComponent implements OnChanges {
  @Input() categoryId = 'friends';
  @Input() icon?: string;
  @Input() color?: string;
  @Input() cssClass = '';

  iconName = '';
  iconColor = '';
  categoryTooltipKey = 'CATEGORIES.FRIENDS';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['categoryId'] || changes['icon'] || changes['color']) {
      this.updateCategoryData();
    }
  }

  private updateCategoryData(): void {
    this.iconName = this.icon || getCategoryIcon(this.categoryId);
    this.iconColor = this.color || getCategoryColor(this.categoryId);
    this.categoryTooltipKey = CATEGORY_KEY_MAP[this.categoryId]
      ?? (getCategoryById(this.categoryId)?.name || 'Unknown');
  }
}
