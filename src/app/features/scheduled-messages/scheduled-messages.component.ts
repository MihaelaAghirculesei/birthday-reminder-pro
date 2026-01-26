import { Component, ChangeDetectionStrategy, computed, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Birthday, ScheduledMessage } from '../../shared';
import { BirthdayFacadeService } from '../../core';
import { MessageScheduleDialogComponent } from './message-schedule-dialog/message-schedule-dialog.component';

@Component({
    selector: 'app-scheduled-messages',
    imports: [
        CommonModule,
        MatCardModule,
        MatIconModule,
        MatButtonModule,
        MatTooltipModule,
    ],
    templateUrl: './scheduled-messages.component.html',
    styleUrls: ['./scheduled-messages.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScheduledMessagesComponent {
  birthdaysWithMessages: Signal<Birthday[]> = computed(() =>
    this.birthdayFacade.birthdays().filter(
      b => b.scheduledMessages && b.scheduledMessages.length > 0
    )
  );

  constructor(
    private birthdayFacade: BirthdayFacadeService,
    private dialog: MatDialog
  ) {}

  openScheduleDialog(birthday?: Birthday): void {
    this.dialog.open(MessageScheduleDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { birthday },
      autoFocus: 'dialog',
      restoreFocus: true
    });
  }

  deleteMessage(birthdayId: string, messageId: string): void {
    if (confirm('Are you sure you want to delete this message?')) {
      this.birthdayFacade.deleteMessageFromBirthday(birthdayId, messageId);
    }
  }

  getPriorityLabel(priority: string): string {
    switch (priority) {
      case 'low':
        return 'Low';
      case 'normal':
        return 'Normal';
      case 'high':
        return 'High';
      default:
        return priority;
    }
  }

  trackByBirthday(_index: number, birthday: Birthday): string {
    return birthday.id;
  }

  trackByMessage(_index: number, message: ScheduledMessage): string {
    return message.id;
  }
}
