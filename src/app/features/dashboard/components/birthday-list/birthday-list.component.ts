import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { take, switchMap, EMPTY, map } from 'rxjs';
import { Birthday, BirthdayCategory, ConfirmDialogComponent } from '../../../../shared';
import { BirthdayItemComponent } from './birthday-item/birthday-item.component';
import { BirthdayFacadeService } from '../../../../core';
import { BirthdayEditDialogComponent, BirthdayEditDialogData } from '../birthday-edit-dialog/birthday-edit-dialog.component';
import { BirthdayImportExportComponent } from './import-export/birthday-import-export.component';
import { getDaysUntilBirthday } from '../../../../shared/utils/date.utils';

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
    ],
    templateUrl: './birthday-list.component.html',
    styleUrls: ['./birthday-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BirthdayListComponent implements OnChanges, OnDestroy {
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

  isAddingTestData = false;
  isClearingData = false;
  private testDataTimer?: ReturnType<typeof setTimeout>;
  private clearDataTimer?: ReturnType<typeof setTimeout>;

  constructor(
    public birthdayFacade: BirthdayFacadeService,
    private dialog: MatDialog
  ) {}

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
    this.isAddingTestData = true;
    this.addTestData.emit();
    this.testDataTimer = setTimeout(() => {
      this.isAddingTestData = false;
    }, 2000);
  }

  onClearAllData(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: 'min(450px, 90vw)',
      data: {
        title: 'Clear All Data?',
        message: 'This will permanently delete all birthdays and categories. This action cannot be undone.',
        confirmText: 'Clear All',
        icon: 'delete_forever',
        color: 'warn'
      }
    });

    dialogRef.afterClosed().pipe(take(1)).subscribe(confirmed => {
      if (confirmed) {
        this.isClearingData = true;
        this.clearAllData.emit();
        this.clearDataTimer = setTimeout(() => {
          this.isClearingData = false;
        }, 2000);
      }
    });
  }

  onBirthdaysImported(birthdays: Birthday[]): void {
    this.birthdaysImported.emit(birthdays);
  }

  ngOnDestroy(): void {
    if (this.testDataTimer) clearTimeout(this.testDataTimer);
    if (this.clearDataTimer) clearTimeout(this.clearDataTimer);
  }

  trackByBirthday(_index: number, birthday: Birthday): string {
    return birthday.id;
  }

  editBirthday(birthday: Birthday): void {
    const dialogData: BirthdayEditDialogData = {
      birthday,
      categories: this.categories
    };

    const dialogRef = this.dialog.open(BirthdayEditDialogComponent, {
      width: '700px',
      maxWidth: '95vw',
      maxHeight: '90vh',
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
        return this.birthdayFacade.getBirthdayById(result.birthday.id).pipe(
          take(1),
          map(current => ({ result, current: current || result.birthday }))
        );
      })
    ).subscribe(({ result, current }) => {
      const updatedBirthday: Birthday = {
        ...current,
        name: result.editedData.name.trim() || result.birthday.name,
        notes: result.editedData.notes.trim(),
        birthDate: new Date(result.editedData.birthDate),
        category: result.editedData.category,
        photo: result.editedData.photo || undefined,
        rememberPhoto: result.editedData.rememberPhoto || undefined,
        email: result.editedData.email.trim() || undefined,
        phone: result.editedData.phone.trim() || undefined,
        telegramUsername: result.editedData.telegramUsername.trim() || undefined
      };
      this.birthdayFacade.updateBirthday(updatedBirthday);
    });
  }

  deleteBirthday(birthday: Birthday): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: 'min(450px, 90vw)',
      data: {
        title: 'Delete Birthday?',
        message: `Are you sure you want to delete "${birthday.name}"?`,
        confirmText: 'Delete',
        icon: 'delete',
        color: 'warn'
      }
    });

    dialogRef.afterClosed().pipe(take(1)).subscribe(confirmed => {
      if (confirmed) {
        this.birthdayFacade.deleteBirthday(birthday.id);
      }
    });
  }
}
