import { Injectable, Signal, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { BirthdayCategory } from '../../shared';
import { AppState } from '../store/app.state';
import * as CategoryActions from '../store/category/category.actions';
import * as CategorySelectors from '../store/category/category.selectors';
import { LocaleService } from './locale.service';

@Injectable({
  providedIn: 'root',
})
export class CategoryFacadeService {
  private readonly localeService = inject(LocaleService);

  categories: Signal<BirthdayCategory[]> = toSignal(this.store.select(CategorySelectors.selectAllCategories), { initialValue: [] });
  defaultCategories: Signal<BirthdayCategory[]> = toSignal(this.store.select(CategorySelectors.selectDefaultCategories), { initialValue: [] });
  customCategories: Signal<BirthdayCategory[]> = toSignal(this.store.select(CategorySelectors.selectCustomCategories), { initialValue: [] });
  loaded: Signal<boolean> = toSignal(this.store.select(CategorySelectors.selectCategoriesLoaded), { initialValue: false });
  loading: Signal<boolean> = toSignal(this.store.select(CategorySelectors.selectCategoriesLoading), { initialValue: false });
  error: Signal<string | null> = toSignal(this.store.select(CategorySelectors.selectCategoriesError), { initialValue: null });

  readonly resolvedCategories: Signal<BirthdayCategory[]> = computed(() => {
    const lang = this.localeService.lang();
    return this.categories().map(cat =>
      cat.nameTranslations?.[lang]
        ? { ...cat, name: cat.nameTranslations[lang] }
        : cat
    );
  });

  constructor(private store: Store<AppState>) {}

  loadCategories(): void {
    this.store.dispatch(CategoryActions.loadCategories());
  }

  addCategory(category: BirthdayCategory): void {
    this.store.dispatch(CategoryActions.addCategory({ category }));
  }

  updateCategory(category: BirthdayCategory): void {
    this.store.dispatch(CategoryActions.updateCategory({ category }));
  }

  deleteCategory(categoryId: string): void {
    this.store.dispatch(CategoryActions.deleteCategory({ categoryId }));
  }

  restoreCategory(categoryId: string): void {
    this.store.dispatch(CategoryActions.restoreCategory({ categoryId }));
  }

  getCategoryById(categoryId: string): Observable<BirthdayCategory | undefined> {
    return this.store.select(CategorySelectors.selectCategoryById(categoryId));
  }
}
