import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { take } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { Birthday, BirthdayCategory, ConfirmDialogComponent } from '../../../shared';
import { CategoryFacadeService, NotificationService } from '../../../core';
import { LocaleService } from '../../../core/services/locale.service';
import { CategoryDialogComponent } from '../components/category-dialog/category-dialog.component';
import { CategoryReassignDialogComponent } from '../components/category-reassign-dialog/category-reassign-dialog.component';
import { AppState } from '../../../core/store/app.state';
import * as BirthdayActions from '../../../core/store/birthday/birthday.actions';
import * as BirthdaySelectors from '../../../core/store/birthday/birthday.selectors';

@Injectable({
  providedIn: 'root'
})
export class CategoryManagerService {
  private readonly store = inject(Store<AppState>);
  private readonly dialog = inject(MatDialog);
  private readonly categoryFacade = inject(CategoryFacadeService);
  private readonly notificationService = inject(NotificationService);
  private readonly localeService = inject(LocaleService);
  private readonly translate = inject(TranslateService);

  private readonly birthdays = toSignal(
    this.store.select(BirthdaySelectors.selectAllBirthdays),
    { initialValue: [] }
  );

  addCategory(): void {
    const dialogRef = this.dialog.open(CategoryDialogComponent, {
      width: 'min(600px, 90vw)',
      maxWidth: '90vw',
      data: { mode: 'add' }
    });

    dialogRef.afterClosed()
      .pipe(take(1))
      .subscribe(result => {
        if (result) {
          const currentLang = this.localeService.currentLang;
          const otherLang = currentLang === 'it' ? 'en' : 'it';
          const nameTranslations: Record<string, string> = { [currentLang]: result.name };
          if (result.nameOtherLang?.trim()) {
            nameTranslations[otherLang] = result.nameOtherLang.trim();
          }

          const newCategory: BirthdayCategory = {
            id: this.generateCategoryId(result.name),
            name: result.name,
            nameTranslations,
            icon: result.icon,
            color: result.color
          };

          this.categoryFacade.addCategory(newCategory);
        }
      });
  }

  editCategory(categoryId: string): void {
    if (categoryId === '__orphaned__') {
      this.handleOrphanedCategoryEdit();
      return;
    }

    const allCategories = this.categoryFacade.categories();
    const category = allCategories.find(c => c.id === categoryId);

    if (!category) return;

    const dialogRef = this.dialog.open(CategoryDialogComponent, {
      width: 'min(600px, 90vw)',
      maxWidth: '90vw',
      data: {
        mode: 'edit',
        category: category
      }
    });

    dialogRef.afterClosed()
      .pipe(take(1))
      .subscribe(result => {
        if (result) {
          const currentLang = this.localeService.currentLang;
          const otherLang = currentLang === 'it' ? 'en' : 'it';
          const nameTranslations: Record<string, string> = {
            ...(category.nameTranslations || {}),
            [currentLang]: result.name
          };
          if (result.nameOtherLang?.trim()) {
            nameTranslations[otherLang] = result.nameOtherLang.trim();
          }

          const updatedCategory: BirthdayCategory = {
            ...category,
            name: result.name,
            nameTranslations,
            icon: result.icon,
            color: result.color
          };
          this.categoryFacade.updateCategory(updatedCategory);
        }
      });
  }

  deleteCategory(categoryId: string): void {
    const allCategories = this.categoryFacade.categories();
    const birthdays = this.birthdays();
    const category = allCategories.find(c => c.id === categoryId);

    if (!category) return;

    const affectedBirthdays = birthdays.filter(b => b.category === categoryId);

    if (affectedBirthdays.length > 0) {
      this.handleCategoryDeletionWithBirthdays(categoryId, category, affectedBirthdays, allCategories);
    } else {
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        width: 'min(450px, 90vw)',
        data: {
          title: this.translate.instant('CONFIRM.DELETE_CATEGORY_TITLE'),
          message: this.translate.instant('CONFIRM.DELETE_CATEGORY_MESSAGE', { name: category.name }),
          confirmText: this.translate.instant('CONFIRM.DELETE_BTN'),
          icon: 'delete',
          color: 'warn'
        }
      });

      dialogRef.afterClosed().pipe(take(1)).subscribe(confirmed => {
        if (confirmed) {
          this.categoryFacade.deleteCategory(categoryId);
        }
      });
    }
  }

  private handleOrphanedCategoryEdit(): void {
    const birthdays = this.birthdays();
    const allCategories = this.categoryFacade.categories();
    const validCategoryIds = new Set(allCategories.map(c => c.id));
    const uncategorizedBirthdays = birthdays.filter(b => b.category && !validCategoryIds.has(b.category));

    if (uncategorizedBirthdays.length === 0) {
      this.notificationService.show(this.translate.instant('NOTIFICATIONS.NO_UNCATEGORIZED'), 'info');
      return;
    }

    const dialogRef = this.dialog.open(CategoryReassignDialogComponent, {
      width: 'min(600px, 90vw)',
      maxWidth: '90vw',
      data: {
        categoryToDelete: { id: '__orphaned__', name: 'Work', icon: 'business_center', color: '#FF9800' },
        affectedBirthdaysCount: uncategorizedBirthdays.length,
        availableCategories: allCategories,
        mode: 'reassign-only'
      }
    });

    dialogRef.afterClosed()
      .pipe(take(1))
      .subscribe(result => {
        if (result && result.action === 'reassign' && result.newCategoryId) {
          this.reassignBirthdays(uncategorizedBirthdays, result.newCategoryId);
        }
      });
  }

  private handleCategoryDeletionWithBirthdays(
    categoryId: string,
    category: BirthdayCategory,
    affectedBirthdays: Birthday[],
    allCategories: BirthdayCategory[]
  ): void {
    const dialogRef = this.dialog.open(CategoryReassignDialogComponent, {
      width: 'min(600px, 90vw)',
      maxWidth: '90vw',
      data: {
        categoryToDelete: category,
        affectedBirthdaysCount: affectedBirthdays.length,
        availableCategories: allCategories
      }
    });

    dialogRef.afterClosed()
      .pipe(take(1))
      .subscribe(result => {
        if (result) {
          if (result.action === 'reassign' && result.newCategoryId) {
            this.reassignBirthdays(affectedBirthdays, result.newCategoryId);
            this.categoryFacade.deleteCategory(categoryId);
          } else if (result.action === 'delete-orphan') {
            this.categoryFacade.deleteCategory(categoryId);
          }
        }
      });
  }

  private reassignBirthdays(birthdays: Birthday[], newCategoryId: string): void {
    birthdays.forEach(birthday => {
      const updatedBirthday = {
        ...birthday,
        category: newCategoryId
      };
      this.store.dispatch(BirthdayActions.updateBirthday({ birthday: updatedBirthday }));
    });
  }

  private generateCategoryId(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
  }
}
