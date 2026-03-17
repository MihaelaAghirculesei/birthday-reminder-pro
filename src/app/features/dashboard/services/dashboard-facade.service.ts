import { Injectable, Signal, WritableSignal, computed, signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { Birthday, BirthdayCategory } from '../../../shared';
import { CategoryFacadeService } from '../../../core';
import { BirthdayStatsService, ChartDataItem } from './birthday-stats.service';
import { CategoryStats } from '../components/category-filter/category-filter.component';
import { getDaysUntilBirthday, parseLocalDate } from '../../../shared/utils/date.utils';
import { AppState } from '../../../core/store/app.state';
import * as BirthdayActions from '../../../core/store/birthday/birthday.actions';
import * as BirthdaySelectors from '../../../core/store/birthday/birthday.selectors';

@Injectable({
  providedIn: 'root'
})
export class DashboardFacadeService {
  private readonly store = inject(Store<AppState>);
  private readonly categoryFacade = inject(CategoryFacadeService);
  private readonly statsService = inject(BirthdayStatsService);

  private readonly birthdays: Signal<Birthday[]> = toSignal(
    this.store.select(BirthdaySelectors.selectAllBirthdays),
    { initialValue: [] }
  );

  private readonly next5Birthdays = toSignal(
    this.store.select(BirthdaySelectors.selectNext5Birthdays),
    { initialValue: [] }
  );

  private readonly storeSelectedCategory: Signal<string | null> = toSignal(
    this.store.select(BirthdaySelectors.selectSelectedCategory),
    { initialValue: null }
  );

  private readonly storeSearchTerm: Signal<string> = toSignal(
    this.store.select(BirthdaySelectors.selectSearchTerm),
    { initialValue: '' }
  );

  private readonly _lastAction: WritableSignal<{ type: string; data: Birthday | BirthdayCategory } | null> = signal(null);

  readonly selectedCategory: Signal<string | null> = this.storeSelectedCategory;
  readonly searchTerm: Signal<string> = this.storeSearchTerm;
  readonly lastAction: Signal<{ type: string; data: Birthday | BirthdayCategory } | null> = this._lastAction.asReadonly();

  readonly totalBirthdays: Signal<number> = computed(() =>
    this.birthdays().length
  );

  readonly birthdaysThisMonth: Signal<number> = computed(() => {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + 30);

    return this.birthdays().filter(birthday => {
      const nextBirthday = parseLocalDate(birthday.birthDate);
      nextBirthday.setFullYear(today.getFullYear());
      if (nextBirthday < today) {
        nextBirthday.setFullYear(today.getFullYear() + 1);
      }
      return nextBirthday >= today && nextBirthday <= futureDate;
    }).length;
  });

  readonly averageAge: Signal<number> = toSignal(
    this.store.select(BirthdaySelectors.selectAverageAge),
    { initialValue: 0 }
  );

  readonly nextBirthdayDays: Signal<number> = computed(() => {
    const next5 = this.next5Birthdays();
    return next5.length > 0 ? next5[0].daysUntil : 0;
  });

  readonly nextBirthdayText: Signal<string> = computed(() => {
    const next5 = this.next5Birthdays();
    if (next5.length === 0) return 'N/A';
    const days = next5[0].daysUntil;
    if (days === 0) return 'Today!';
    if (days === 1) return 'Tomorrow!';
    return `In ${days} days`;
  });

  readonly chartData: Signal<ChartDataItem[]> = computed(() =>
    this.statsService.getChartData(this.birthdays())
  );

  readonly maxCount: Signal<number> = computed(() =>
    this.statsService.getMaxCount(this.chartData())
  );

  readonly categoriesStats: Signal<CategoryStats[]> = computed(() => {
    const birthdays = this.birthdays();
    const allCategories = this.categoryFacade.categories();
    const stats = this.statsService.getCategoriesStats(birthdays);
    const validCategoryIds = new Set(allCategories.map(c => c.id));
    const statsMap = new Map(stats.map(s => [s.categoryId, s.count]));

    const orphanedCount = birthdays.filter(b =>
      b.category && !validCategoryIds.has(b.category)
    ).length;

    const categoryStats = allCategories.map(category => ({
      id: category.id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      count: statsMap.get(category.id) || 0
    }));

    if (orphanedCount > 0) {
      categoryStats.unshift({
        id: '__orphaned__',
        name: 'Work',
        icon: 'business_center',
        color: '#FF9800',
        count: orphanedCount
      });
    }

    return categoryStats;
  });

  readonly filteredBirthdays: Signal<Birthday[]> = computed(() => {
    const birthdays = this.birthdays();
    const categories = this.categoryFacade.categories();
    const selectedCat = this.storeSelectedCategory();
    const search = this.storeSearchTerm();

    if (!birthdays) return [];

    let filtered = [...birthdays];

    if (selectedCat) {
      if (selectedCat === '__orphaned__') {
        const validCategoryIds = new Set(categories.map(c => c.id));
        filtered = filtered.filter(b => b.category && !validCategoryIds.has(b.category));
      } else {
        filtered = filtered.filter(b => b.category === selectedCat);
      }
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(b =>
        b.name.toLowerCase().split(/\s+/).some(word => word.startsWith(searchLower))
      );
    }

    return filtered.sort((a, b) => getDaysUntilBirthday(a.birthDate) - getDaysUntilBirthday(b.birthDate));
  });

  readonly categories: Signal<BirthdayCategory[]> = this.categoryFacade.categories;

  selectCategory(categoryId: string | null): void {
    const current = this.storeSelectedCategory();
    const newValue = current === categoryId ? null : categoryId;
    this.store.dispatch(BirthdayActions.setSelectedCategory({ category: newValue }));
  }

  clearCategoryFilter(): void {
    this.store.dispatch(BirthdayActions.setSelectedCategory({ category: null }));
  }

  setSearchTerm(term: string): void {
    this.store.dispatch(BirthdayActions.setSearchTerm({ searchTerm: term }));
  }

  clearSearch(): void {
    this.store.dispatch(BirthdayActions.setSearchTerm({ searchTerm: '' }));
  }

  addBirthday(birthday: Omit<Birthday, 'id'>): void {
    this.store.dispatch(BirthdayActions.addBirthday({ birthday }));
  }

  deleteBirthday(birthday: Birthday): void {
    this._lastAction.set({ type: 'delete', data: { ...birthday } });
    this.store.dispatch(BirthdayActions.deleteBirthday({ id: birthday.id }));
  }

  undoLastAction(): void {
    const action = this._lastAction();
    if (action?.type === 'delete') {
      this.store.dispatch(BirthdayActions.addBirthday({ birthday: action.data as Birthday }));
      this._lastAction.set(null);
    }
  }

  loadTestData(): void {
    this.store.dispatch(BirthdayActions.loadTestData());
  }

  clearAllData(): void {
    this.store.dispatch(BirthdayActions.clearAllBirthdays());
    this._lastAction.set(null);
  }

  async importBirthdays(birthdays: Birthday[]): Promise<void> {
    for (const birthday of birthdays) {
      this.store.dispatch(BirthdayActions.addBirthday({ birthday }));
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  isCategorySelected(categoryId: string): boolean {
    return this.storeSelectedCategory() === categoryId;
  }
}
