import { Injectable, Signal, WritableSignal, computed, signal, inject } from '@angular/core';
import { Birthday, BirthdayCategory } from '../../../shared';
import { BirthdayFacadeService, CategoryFacadeService } from '../../../core';
import { BirthdayStatsService, ChartDataItem } from './birthday-stats.service';
import { CategoryStats } from '../components/category-filter/category-filter.component';
import { getDaysUntilBirthday } from '../../../shared/utils/date.utils';

@Injectable({
  providedIn: 'root'
})
export class DashboardFacadeService {
  private readonly birthdayFacade = inject(BirthdayFacadeService);
  private readonly categoryFacade = inject(CategoryFacadeService);
  private readonly statsService = inject(BirthdayStatsService);

  private readonly _selectedCategory: WritableSignal<string | null> = signal(null);
  private readonly _searchTerm: WritableSignal<string> = signal('');
  private readonly _lastAction: WritableSignal<{ type: string; data: Birthday | BirthdayCategory } | null> = signal(null);

  readonly selectedCategory: Signal<string | null> = this._selectedCategory.asReadonly();
  readonly searchTerm: Signal<string> = this._searchTerm.asReadonly();
  readonly lastAction: Signal<{ type: string; data: Birthday | BirthdayCategory } | null> = this._lastAction.asReadonly();

  readonly totalBirthdays: Signal<number> = computed(() =>
    this.birthdayFacade.birthdays().length
  );

  readonly birthdaysThisMonth: Signal<number> = computed(() => {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + 30);

    return this.birthdayFacade.birthdays().filter(birthday => {
      const nextBirthday = new Date(birthday.birthDate);
      nextBirthday.setFullYear(today.getFullYear());
      if (nextBirthday < today) {
        nextBirthday.setFullYear(today.getFullYear() + 1);
      }
      return nextBirthday >= today && nextBirthday <= futureDate;
    }).length;
  });

  readonly averageAge: Signal<number> = this.birthdayFacade.averageAge;

  readonly nextBirthdayDays: Signal<number> = computed(() => {
    const next5 = this.birthdayFacade.next5Birthdays();
    return next5.length > 0 ? next5[0].daysUntil : 0;
  });

  readonly nextBirthdayText: Signal<string> = computed(() => {
    const next5 = this.birthdayFacade.next5Birthdays();
    if (next5.length === 0) return 'N/A';
    const days = next5[0].daysUntil;
    if (days === 0) return 'Today!';
    if (days === 1) return 'Tomorrow!';
    return `In ${days} days`;
  });

  readonly chartData: Signal<ChartDataItem[]> = computed(() =>
    this.statsService.getChartData(this.birthdayFacade.birthdays())
  );

  readonly maxCount: Signal<number> = computed(() =>
    this.statsService.getMaxCount(this.chartData())
  );

  readonly categoriesStats: Signal<CategoryStats[]> = computed(() => {
    const birthdays = this.birthdayFacade.birthdays();
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
    const birthdays = this.birthdayFacade.birthdays();
    const categories = this.categoryFacade.categories();
    const selectedCat = this._selectedCategory();
    const search = this._searchTerm();

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
      filtered = filtered.filter(b => b.name.toLowerCase().includes(searchLower));
    }

    return filtered.sort((a, b) => getDaysUntilBirthday(a.birthDate) - getDaysUntilBirthday(b.birthDate));
  });

  readonly categories: Signal<BirthdayCategory[]> = this.categoryFacade.categories;

  selectCategory(categoryId: string | null): void {
    const current = this._selectedCategory();
    this._selectedCategory.set(current === categoryId ? null : categoryId);
  }

  clearCategoryFilter(): void {
    this._selectedCategory.set(null);
  }

  setSearchTerm(term: string): void {
    this._searchTerm.set(term);
  }

  clearSearch(): void {
    this._searchTerm.set('');
  }

  addBirthday(birthday: Omit<Birthday, 'id'>): void {
    this.birthdayFacade.addBirthday(birthday);
  }

  deleteBirthday(birthday: Birthday): void {
    this._lastAction.set({ type: 'delete', data: { ...birthday } });
    this.birthdayFacade.deleteBirthday(birthday.id);
  }

  undoLastAction(): void {
    const action = this._lastAction();
    if (action?.type === 'delete') {
      this.birthdayFacade.addBirthday(action.data as Birthday);
      this._lastAction.set(null);
    }
  }

  loadTestData(): void {
    this.birthdayFacade.loadTestData();
  }

  clearAllData(): void {
    this.birthdayFacade.clearAllBirthdays();
    this._lastAction.set(null);
  }

  async importBirthdays(birthdays: Birthday[]): Promise<void> {
    for (const birthday of birthdays) {
      this.birthdayFacade.addBirthday(birthday);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  isCategorySelected(categoryId: string): boolean {
    return this._selectedCategory() === categoryId;
  }
}
