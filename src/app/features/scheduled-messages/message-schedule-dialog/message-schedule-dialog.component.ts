import { ChangeDetectionStrategy, Component, computed, inject,type OnInit, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog,MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Store } from '@ngrx/store';

import { TranslatePipe } from '@ngx-translate/core';
import { take } from 'rxjs/operators';

import { CategoryFacadeService } from '../../../core';
import { type AppState } from '../../../core/store/app.state';
import * as BirthdayActions from '../../../core/store/birthday/birthday.actions';
import * as BirthdaySelectors from '../../../core/store/birthday/birthday.selectors';
import { MessageSchedulerComponent } from '../../../shared/components/message-scheduler/message-scheduler.component';
import { type Birthday } from '../../../shared/models';
import { LocalDatePipe } from '../../../shared/pipes/local-date.pipe';
import { LocaleDatePipe } from '../../../shared/pipes/locale-date.pipe';
import { getDaysUntilBirthday } from '../../../shared/utils/date';
import { BirthdayEditDialogComponent, type BirthdayEditDialogData } from '../../dashboard/components/birthday-edit-dialog/birthday-edit-dialog.component';

interface MessageScheduleDialogData {
  birthday?: Birthday;
  birthdayId?: string;
}

interface BirthdayOptionView {
  birthday: Birthday;
  hasContact: boolean;
  contactInfo: string;
}

function buildContactInfo(b: Birthday): string {
  const parts: string[] = [];
  if (b.email?.trim()) parts.push(b.email.trim());
  if (b.phone?.trim()) parts.push(b.phone.trim());
  if (b.telegramUsername?.trim()) parts.push('@' + b.telegramUsername.trim());
  return parts.join(' · ');
}

@Component({
    selector: 'app-message-schedule-dialog',
    imports: [
        FormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatSelectModule,
        MatIconModule,
        MatButtonModule,
        MatTooltipModule,
        MessageSchedulerComponent,
        LocalDatePipe,
        TranslatePipe,
        LocaleDatePipe,
    ],
    templateUrl: './message-schedule-dialog.component.html',
    styleUrls: ['./message-schedule-dialog.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessageScheduleDialogComponent implements OnInit {
  private dialogRef = inject<MatDialogRef<MessageScheduleDialogComponent>>(MatDialogRef);
  data = inject<MessageScheduleDialogData>(MAT_DIALOG_DATA);

  private readonly store = inject(Store<AppState>);
  private readonly categoryFacade = inject(CategoryFacadeService);
  private readonly dialog = inject(MatDialog);

  private readonly birthdays = toSignal(
    this.store.select(BirthdaySelectors.selectAllBirthdays),
    { initialValue: [] }
  );

  selectedBirthday: Birthday | null = null;
  allBirthdays: Signal<Birthday[]> = computed(() =>
    [...this.birthdays()].sort(
      (a, b) => getDaysUntilBirthday(a.birthDate) - getDaysUntilBirthday(b.birthDate)
    )
  );
  birthdayOptions: Signal<BirthdayOptionView[]> = computed(() =>
    this.allBirthdays().map(b => ({
      birthday: b,
      hasContact: !!(b.email?.trim() || b.phone?.trim() || b.telegramUsername?.trim()),
      contactInfo: buildContactInfo(b)
    }))
  );
  noBirthdays: Signal<boolean> = computed(() => this.allBirthdays().length === 0);
  selectedBirthdayId = '';
  showBirthdaySelector = false;

  ngOnInit(): void {
    if (this.data?.birthday) {
      this.selectedBirthday = this.data.birthday;
    } else if (this.data?.birthdayId) {
      const found = this.allBirthdays().find(b => b.id === this.data.birthdayId);
      if (found) {
        this.selectedBirthday = found;
      }
    } else {
      this.showBirthdaySelector = true;
    }
  }

  onOptionClick(event: MouseEvent, option: BirthdayOptionView): void {
    if (option.hasContact) return;

    event.stopPropagation();
    this.selectedBirthdayId = '';

    const dialogData: BirthdayEditDialogData = {
      birthday: option.birthday,
      categories: this.categoryFacade.categories()
    };

    const editRef = this.dialog.open(BirthdayEditDialogComponent, {
      width: '700px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'birthday-edit-dialog-panel',
      data: dialogData,
      autoFocus: 'first-tabbable'
    });

    editRef.afterClosed().pipe(take(1)).subscribe(result => {
      if (!result) return;
      const updated: Birthday = {
        ...result.birthday,
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
      this.store.dispatch(BirthdayActions.updateBirthday({ birthday: updated, operationId: crypto.randomUUID() }));
    });
  }

  onBirthdaySelected(): void {
    if (this.selectedBirthdayId) {
      const found = this.allBirthdays().find(b => b.id === this.selectedBirthdayId);
      if (found) {
        this.selectedBirthday = found;
        this.showBirthdaySelector = false;
      }
    }
  }

  changeBirthday(): void {
    this.showBirthdaySelector = true;
    this.selectedBirthday = null;
  }

  close(): void {
    this.dialogRef.close();
  }

  trackByBirthday(_index: number, birthday: Birthday): string {
    return birthday.id;
  }
}
