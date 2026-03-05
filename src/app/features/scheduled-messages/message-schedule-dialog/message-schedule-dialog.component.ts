import { Component, Inject, OnInit, ChangeDetectionStrategy, Signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { take } from 'rxjs/operators';
import { MessageSchedulerComponent } from '../../../shared/components/message-scheduler/message-scheduler.component';
import { Birthday } from '../../../shared/models';
import { BirthdayFacadeService, CategoryFacadeService } from '../../../core';
import { getDaysUntilBirthday } from '../../../shared/utils/date.utils';
import { BirthdayEditDialogComponent, BirthdayEditDialogData } from '../../dashboard/components/birthday-edit-dialog/birthday-edit-dialog.component';

interface MessageScheduleDialogData {
  birthday?: Birthday;
  birthdayId?: string;
}

@Component({
    selector: 'app-message-schedule-dialog',
    imports: [
        CommonModule,
        FormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatSelectModule,
        MatIconModule,
        MatButtonModule,
        MatTooltipModule,
        MessageSchedulerComponent
    ],
    templateUrl: './message-schedule-dialog.component.html',
    styleUrls: ['./message-schedule-dialog.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessageScheduleDialogComponent implements OnInit {
  selectedBirthday: Birthday | null = null;
  allBirthdays: Signal<Birthday[]> = computed(() =>
    [...this.birthdayFacade.birthdays()].sort(
      (a, b) => getDaysUntilBirthday(new Date(a.birthDate)) - getDaysUntilBirthday(new Date(b.birthDate))
    )
  );
  noBirthdays: Signal<boolean> = computed(() => this.allBirthdays().length === 0);
  selectedBirthdayId = '';
  showBirthdaySelector = false;

  constructor(
    private dialogRef: MatDialogRef<MessageScheduleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MessageScheduleDialogData,
    private birthdayFacade: BirthdayFacadeService,
    private categoryFacade: CategoryFacadeService,
    private dialog: MatDialog
  ) {}

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

  onOptionClick(event: MouseEvent, birthday: Birthday): void {
    if (this.hasContact(birthday)) return;

    event.stopPropagation();
    this.selectedBirthdayId = '';

    const dialogData: BirthdayEditDialogData = {
      birthday,
      categories: this.categoryFacade.categories()
    };

    const editRef = this.dialog.open(BirthdayEditDialogComponent, {
      width: '700px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: dialogData,
      autoFocus: 'first-tabbable'
    });

    editRef.afterClosed().pipe(take(1)).subscribe(result => {
      if (!result) return;
      const updated: Birthday = {
        ...result.birthday,
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
      this.birthdayFacade.updateBirthday(updated);
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

  hasContact(birthday: Birthday): boolean {
    return !!(birthday.email?.trim() || birthday.phone?.trim() || birthday.telegramUsername?.trim());
  }

  getContactInfo(birthday: Birthday): string {
    const parts: string[] = [];
    if (birthday.email?.trim()) parts.push(birthday.email.trim());
    if (birthday.phone?.trim()) parts.push(birthday.phone.trim());
    if (birthday.telegramUsername?.trim()) parts.push('@' + birthday.telegramUsername.trim());
    return parts.join(' · ');
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
