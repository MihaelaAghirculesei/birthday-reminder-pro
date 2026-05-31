import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, NgZone, type OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TranslatePipe } from '@ngx-translate/core';
import { fromEvent } from 'rxjs';

import { type Birthday, NotificationPermissionBannerComponent } from '../../../shared';
import { CalendarIconComponent } from '../../../shared/icons/calendar-icon.component';
import { MessageScheduleDialogComponent } from '../../scheduled-messages/message-schedule-dialog/message-schedule-dialog.component';
import { BirthdayEditService, CategoryManagerService, DashboardFacadeService } from '../services';
import { BirthdayChartComponent } from './birthday-chart/birthday-chart.component';
import { BirthdayListComponent } from './birthday-list/birthday-list.component';
import { CategoryFilterComponent } from './category-filter/category-filter.component';
import { DashboardStatsComponent } from './stats/dashboard-stats.component';

@Component({
  selector: 'app-dashboard',
  imports: [
    TranslatePipe,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    CalendarIconComponent,
    DashboardStatsComponent,
    BirthdayChartComponent,
    CategoryFilterComponent,
    BirthdayListComponent,
    NotificationPermissionBannerComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [DashboardFacadeService]
})
export class DashboardComponent implements OnInit {
  readonly facade = inject(DashboardFacadeService);
  readonly editService = inject(BirthdayEditService);
  private readonly dialog = inject(MatDialog);
  private readonly categoryManager = inject(CategoryManagerService);
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);

  readonly currentMonth = new Date().getMonth();
  readonly forceLoad = !!(window as Window & { Cypress?: unknown }).Cypress;

  ngOnInit(): void {
    this.ngZone.runOutsideAngular(() => {
      fromEvent<MouseEvent>(this.document, 'click')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(event => this.handleDocumentClick(event));
    });
  }

  onCategorySelect(categoryId: string): void {
    this.facade.selectCategory(categoryId);
  }

  onClearCategoryFilter(): void {
    this.facade.clearCategoryFilter();
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

  onOpenMessageDialog(event?: MouseEvent): void {
    if (event?.target instanceof HTMLElement) {
      const button = event.target.closest('button');
      if (button) button.blur();
    }

    this.dialog.open(MessageScheduleDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      autoFocus: 'dialog',
      restoreFocus: true,
    });
  }

  onSearchTermChange(searchTerm: string): void {
    this.facade.setSearchTerm(searchTerm);
  }

  onClearSearch(): void {
    this.facade.clearSearch();
  }

  onAddTestData(): void {
    this.facade.loadTestData();
  }

  onClearAllData(): void {
    this.facade.clearAllData();
  }

  onBirthdaysImported(birthdays: Birthday[]): void {
    this.facade.importBirthdays(birthdays);
  }

  onUndoAction(): void {
    this.facade.undoLastAction();
  }

  onBirthdayDeleted(birthday: Birthday): void {
    this.facade.deleteBirthday(birthday);
  }

  private handleDocumentClick(event: MouseEvent): void {
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
        this.ngZone.run(() => this.editService.cancelEdit());
      }
    } else {
      this.ngZone.run(() => this.editService.cancelEdit());
    }
  }
}
