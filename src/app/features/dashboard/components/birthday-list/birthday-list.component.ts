import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { take } from 'rxjs';
import { Birthday, BirthdayCategory } from '../../../../shared';
import { BirthdayItemComponent } from './birthday-item/birthday-item.component';
import { BirthdayImportExportComponent } from './import-export/birthday-import-export.component';
import { BirthdayFacadeService } from '../../../../core';
import { BirthdayEditDialogComponent, BirthdayEditDialogData, BirthdayEditDialogResult } from '../birthday-edit-dialog/birthday-edit-dialog.component';
import { getDaysUntilBirthday } from '../../../../shared/utils/date.utils';

interface EnrichedBirthday extends Birthday {
  daysUntilBirthday: number;
}

@Component({
    selector: 'app-birthday-list',
    imports: [
        FormsModule,
        ScrollingModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatButtonModule,
        MatTooltipModule,
        BirthdayItemComponent,
        BirthdayImportExportComponent
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
    this.isClearingData = true;
    this.clearAllData.emit();
    this.clearDataTimer = setTimeout(() => {
      this.isClearingData = false;
    }, 2000);
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

    dialogRef.afterClosed().pipe(take(1)).subscribe((result: BirthdayEditDialogResult | undefined) => {
      if (result) {
        const updatedBirthday: Birthday = {
          ...result.birthday,
          name: result.editedData.name.trim() || result.birthday.name,
          notes: result.editedData.notes.trim(),
          birthDate: new Date(result.editedData.birthDate),
          category: result.editedData.category,
          photo: result.editedData.photo || undefined,
          rememberPhoto: result.editedData.rememberPhoto || undefined
        };
        this.birthdayFacade.updateBirthday(updatedBirthday);
      }
    });
  }

  deleteBirthday(birthday: Birthday): void {
    this.birthdayFacade.deleteBirthday(birthday.id);
  }
}
