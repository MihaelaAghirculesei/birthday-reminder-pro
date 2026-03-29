import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectionStrategy, DestroyRef, signal, inject, computed, Signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { take, switchMap, EMPTY, map, timer, fromEvent } from 'rxjs';
import { Store } from '@ngrx/store';
import { Birthday, BirthdayCategory, ConfirmDialogComponent } from '../../../../shared';
import { BirthdayItemComponent } from './birthday-item/birthday-item.component';
import type { BirthdayEditDialogData } from '../birthday-edit-dialog/birthday-edit-dialog.component';
import { BirthdayImportExportComponent } from './import-export/birthday-import-export.component';
import { getDaysUntilBirthday } from '../../../../shared/utils/date.utils';
import { sanitizeBirthdayData, safeParseBirthday } from '../../../../shared/schemas/birthday.schema';
import { LoggerService } from '../../../../core/services/logger.service';
import { AppState } from '../../../../core/store/app.state';
import * as BirthdayActions from '../../../../core/store/birthday/birthday.actions';
import * as BirthdaySelectors from '../../../../core/store/birthday/birthday.selectors';

interface EnrichedBirthday extends Birthday {
  daysUntilBirthday: number;
}

@Component({
    selector: 'app-birthday-list',
    imports: [
        FormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatButtonModule,
        MatTooltipModule,
        BirthdayItemComponent,
        BirthdayImportExportComponent,
        TranslatePipe,
        ScrollingModule,
    ],
    templateUrl: './birthday-list.component.html',
    styleUrls: ['./birthday-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BirthdayListComponent implements OnChanges {
  @Input() birthdays: Birthday[] = [];
  @Input() categories: BirthdayCategory[] = [];
  @Input() searchTerm = '';
  @Input() lastAction: { type: string; data: Birthday | BirthdayCategory } | null = null;
  @Input() totalBirthdays = 0;

  enrichedBirthdays: EnrichedBirthday[] = [];

  @Output() searchTermChange = new EventEmitter<string>();
  @Output() clearSearch = new EventEmitter<void>();
  @Output() undoAction = new EventEmitter<void>();
  @Output() addTestData = new EventEmitter<void>();
  @Output() clearAllData = new EventEmitter<void>();
  @Output() birthdaysImported = new EventEmitter<Birthday[]>();

  isAddingTestData = signal(false);
  isClearingData = signal(false);

  private readonly platformId = inject(PLATFORM_ID);

  private readonly windowWidth: Signal<number> = isPlatformBrowser(this.platformId)
    ? toSignal(
        fromEvent(window, 'resize').pipe(map(() => window.innerWidth)),
        { initialValue: window.innerWidth }
      )
    : signal(1200);

  /** itemSize for CdkVirtualScrollViewport: compact (<=680px matches tablet-md CSS breakpoint) vs. full layout */
  readonly virtualScrollItemSize = computed(() => this.windowWidth() <= 680 ? 100 : 300);

  private readonly store = inject(Store<AppState>);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly logger = inject(LoggerService);
  private readonly translate = inject(TranslateService);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['birthdays']) {
      this.enrichedBirthdays = this.birthdays.map(birthday => ({
        ...birthday,
        daysUntilBirthday: getDaysUntilBirthday(birthday.birthDate)
      }));
    }
  }

  onSearchChange(event: Event): void {
    this.searchTermChange.emit((event.target as HTMLInputElement).value);
  }

  onClearSearch(): void {
    this.clearSearch.emit();
  }

  onUndo(): void {
    this.undoAction.emit();
  }

  onAddTestData(): void {
    this.isAddingTestData.set(true);
    this.addTestData.emit();
    timer(2000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.isAddingTestData.set(false));
  }

  onClearAllData(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: 'min(450px, 90vw)',
      data: {
        title: this.translate.instant('CONFIRM.CLEAR_ALL_TITLE'),
        message: this.translate.instant('CONFIRM.CLEAR_ALL_MESSAGE'),
        confirmText: this.translate.instant('CONFIRM.CLEAR_ALL_BTN'),
        icon: 'delete_forever',
        color: 'warn'
      }
    });

    dialogRef.afterClosed().pipe(take(1)).subscribe(confirmed => {
      if (confirmed) {
        this.isClearingData.set(true);
        this.clearAllData.emit();
        timer(2000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.isClearingData.set(false));
      }
    });
  }

  onBirthdaysImported(birthdays: Birthday[]): void {
    this.birthdaysImported.emit(birthdays);
  }

  trackByBirthday(_index: number, birthday: Birthday): string {
    return birthday.id;
  }

  async editBirthday(birthday: Birthday): Promise<void> {
    const { BirthdayEditDialogComponent } = await import('../birthday-edit-dialog/birthday-edit-dialog.component');

    const dialogData: BirthdayEditDialogData = {
      birthday,
      categories: this.categories
    };

    const dialogRef = this.dialog.open(BirthdayEditDialogComponent, {
      width: '700px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'birthday-edit-dialog-panel',
      data: dialogData,
      disableClose: false,
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      ariaModal: true
    });

    dialogRef.afterClosed().pipe(
      take(1),
      switchMap(result => {
        if (!result) return EMPTY;
        return this.store.select(BirthdaySelectors.selectBirthdayById(result.birthday.id)).pipe(
          take(1),
          map(current => ({ result, current: current || result.birthday }))
        );
      })
    ).subscribe(({ result, current }) => {
      const raw = {
        ...current,
        name: result.editedData.name.trim() || result.birthday.name,
        notes: result.editedData.notes.trim(),
        birthDate: result.editedData.birthDate,
        category: result.editedData.category,
        photo: result.editedData.photo || undefined,
        rememberPhoto: result.editedData.rememberPhoto || undefined,
        email: result.editedData.email.trim() || undefined,
        phone: result.editedData.phone.trim() || undefined,
        telegramUsername: result.editedData.telegramUsername.trim() || undefined
      };
      const sanitized = sanitizeBirthdayData(raw);
      const validation = safeParseBirthday(sanitized);
      if (!validation.success) {
        this.logger.error('[BirthdayList] Edit validation failed:', validation.error.issues);
        return;
      }
      this.store.dispatch(BirthdayActions.updateBirthday({ birthday: validation.data }));
    });
  }

  deleteBirthday(birthday: Birthday): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: 'min(450px, 90vw)',
      data: {
        title: this.translate.instant('CONFIRM.DELETE_BIRTHDAY_TITLE'),
        message: this.translate.instant('CONFIRM.DELETE_BIRTHDAY_MESSAGE', { name: birthday.name }),
        confirmText: this.translate.instant('CONFIRM.DELETE_BTN'),
        icon: 'delete',
        color: 'warn'
      }
    });

    dialogRef.afterClosed().pipe(take(1)).subscribe(confirmed => {
      if (confirmed) {
        this.store.dispatch(BirthdayActions.deleteBirthday({ id: birthday.id }));
      }
    });
  }
}
