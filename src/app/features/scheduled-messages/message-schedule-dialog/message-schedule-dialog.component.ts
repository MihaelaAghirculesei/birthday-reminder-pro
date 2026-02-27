import { Component, Inject, OnInit, ChangeDetectionStrategy, Signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MessageSchedulerComponent } from '../../../shared/components/message-scheduler/message-scheduler.component';
import { Birthday } from '../../../shared/models';
import { BirthdayFacadeService } from '../../../core';

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
  allBirthdays: Signal<Birthday[]> = this.birthdayFacade.birthdays;
  noBirthdays: Signal<boolean> = computed(() => this.allBirthdays().length === 0);
  selectedBirthdayId = '';
  showBirthdaySelector = false;

  constructor(
    private dialogRef: MatDialogRef<MessageScheduleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MessageScheduleDialogData,
    private birthdayFacade: BirthdayFacadeService
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
