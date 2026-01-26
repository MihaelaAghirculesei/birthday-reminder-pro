import { Component, HostListener, ChangeDetectionStrategy, Signal, computed, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Birthday, BirthdayCategory, NotificationPermissionBannerComponent } from '../../../shared';
import { CalendarIconComponent } from '../../../shared/icons/calendar-icon.component';
import { GoogleCalendarSyncComponent } from '../../calendar-sync/google-calendar-sync.component';
import { DashboardStatsComponent } from './stats/dashboard-stats.component';
import { BirthdayChartComponent } from './birthday-chart/birthday-chart.component';
import { CategoryFilterComponent, CategoryStats } from './category-filter/category-filter.component';
import { BirthdayListComponent } from './birthday-list/birthday-list.component';
import { MessageScheduleDialogComponent } from '../../scheduled-messages/message-schedule-dialog/message-schedule-dialog.component';
import { BirthdayFacadeService, CategoryFacadeService } from '../../../core';
import { BirthdayEditService, BirthdayStatsService, ChartDataItem, CategoryManagerService } from '../services';
import { getDaysUntilBirthday } from '../../../shared/utils/date.utils';

@Component({
    selector: 'app-dashboard',
    imports: [
        CommonModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        CalendarIconComponent,
        DashboardStatsComponent,
        BirthdayChartComponent,
        CategoryFilterComponent,
        BirthdayListComponent,
        GoogleCalendarSyncComponent,
        NotificationPermissionBannerComponent
    ],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  totalBirthdays: Signal<number>;
  birthdaysThisMonth: Signal<number>;
  averageAge: Signal<number>;
  nextBirthdayDays: Signal<number>;
  nextBirthdayText: Signal<string>;
  chartData: Signal<ChartDataItem[]>;
  maxCount: Signal<number>;
  categoriesStats: Signal<CategoryStats[]>;
  allBirthdays: Signal<Birthday[]>;
  categories: Signal<BirthdayCategory[]>;

  selectedCategorySignal: WritableSignal<string | null> = signal(null);
  dashboardSearchTermSignal: WritableSignal<string> = signal('');

  get selectedCategory(): string | null {
    return this.selectedCategorySignal();
  }
  set selectedCategory(value: string | null) {
    this.selectedCategorySignal.set(value);
  }

  get dashboardSearchTerm(): string {
    return this.dashboardSearchTermSignal();
  }
  set dashboardSearchTerm(value: string) {
    this.dashboardSearchTermSignal.set(value);
  }

  currentMonth = new Date().getMonth();
  lastAction: { type: string; data: Birthday | BirthdayCategory } | null = null;

  constructor(
    public birthdayFacade: BirthdayFacadeService,
    private categoryFacade: CategoryFacadeService,
    public editService: BirthdayEditService,
    private statsService: BirthdayStatsService,
    private dialog: MatDialog,
    private categoryManager: CategoryManagerService
  ) {
    this.totalBirthdays = computed(() => this.birthdayFacade.birthdays().length);

    this.birthdaysThisMonth = computed(() => {
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

    this.averageAge = this.birthdayFacade.averageAge;

    this.nextBirthdayDays = computed(() => {
      const next5 = this.birthdayFacade.next5Birthdays();
      return next5.length > 0 ? next5[0].daysUntil : 0;
    });

    this.nextBirthdayText = computed(() => {
      const next5 = this.birthdayFacade.next5Birthdays();
      if (next5.length === 0) return 'N/A';
      const days = next5[0].daysUntil;
      if (days === 0) return 'Today!';
      if (days === 1) return 'Tomorrow!';
      return `In ${days} days`;
    });

    this.chartData = computed(() =>
      this.statsService.getChartData(this.birthdayFacade.birthdays())
    );

    this.maxCount = computed(() =>
      this.statsService.getMaxCount(this.chartData())
    );

    this.categoriesStats = computed(() => {
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

    this.allBirthdays = computed(() => {
      const birthdays = this.birthdayFacade.birthdays();
      const categories = this.categoryFacade.categories();
      const selectedCat = this.selectedCategorySignal();
      const searchTerm = this.dashboardSearchTermSignal();

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

      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filtered = filtered.filter(b =>
          b.name.toLowerCase().includes(searchLower)
        );
      }

      return filtered.sort((a, b) => {
        const daysA = getDaysUntilBirthday(a.birthDate);
        const daysB = getDaysUntilBirthday(b.birthDate);
        return daysA - daysB;
      });
    });

    this.categories = this.categoryFacade.categories;
  }

  selectCategory(categoryId: string): void {
    this.selectedCategory = this.selectedCategory === categoryId ? null : categoryId;
  }

  clearCategoryFilter(): void {
    this.selectedCategory = null;
  }

  onAddCategory(): void {
    this.categoryManager.addCategory();
  }

  onEditCategory(categoryId: string): void {
    this.categoryManager.editCategory(categoryId);
  }

  onDeleteCategory(categoryId: string): void {
    this.categoryManager.deleteCategory(categoryId);
  }

  openMessageDialog(event?: MouseEvent): void {
    if (event?.target instanceof HTMLElement) {
      const button = event.target.closest('button');
      if (button) {
        button.blur();
      }
    }

    this.dialog.open(MessageScheduleDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      autoFocus: 'dialog',
      restoreFocus: true
    });
  }

  isCategorySelected(categoryId: string): boolean {
    return this.selectedCategory === categoryId;
  }

  onSearchTermChange(searchTerm: string): void {
    this.dashboardSearchTerm = searchTerm;
  }

  onClearSearch(): void {
    this.dashboardSearchTerm = '';
  }

  addTestData(): void {
    this.birthdayFacade.loadTestData();
  }

  clearAllData(): void {
    this.birthdayFacade.clearAllBirthdays();
    this.lastAction = null;
  }

  async onBirthdaysImported(birthdays: Birthday[]): Promise<void> {
    for (const birthday of birthdays) {
      this.birthdayFacade.addBirthday(birthday);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  undoLastAction(): void {
    if (this.lastAction && this.lastAction.type === 'delete') {
      this.birthdayFacade.addBirthday(this.lastAction.data as Birthday);
      this.lastAction = null;
    }
  }

  onBirthdayDeleted(birthday: Birthday): void {
    this.lastAction = { type: 'delete', data: { ...birthday } };
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.editService.currentEditingId) return;

    const target = event.target as HTMLElement;

    if (target.closest('.collapsible-header, .add-birthday-card, .category-filter')) {
      return;
    }

    if (target.closest('button, mat-icon')) {
      return;
    }

    const clickedBirthdayItem = target.closest('.dashboard-birthday-item') as HTMLElement;

    if (clickedBirthdayItem) {
      const isInEditMode = clickedBirthdayItem.querySelector('.edit-name-input, .dashboard-category-edit, .dashboard-photo-edit');
      if (!isInEditMode) {
        this.editService.cancelEdit();
      }
    } else {
      this.editService.cancelEdit();
    }
  }
}
