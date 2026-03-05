import { Component, ChangeDetectionStrategy, computed, Signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { take } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Birthday, ScheduledMessage, WishLink, getAvailableWishLinks, ConfirmDialogComponent } from '../../shared';
import { getDaysUntilBirthday } from '../../shared/utils/date.utils';
import { BirthdayFacadeService, SenderSettingsService } from '../../core';
import { MessageScheduleDialogComponent } from './message-schedule-dialog/message-schedule-dialog.component';

interface BirthdayMessageView {
  birthday: Birthday;
  messages: (ScheduledMessage & { wishLinks: WishLink[] })[];
}

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
  birthdaysWithMessages: Signal<BirthdayMessageView[]> = computed(() => {
    const senderName = this.senderSettings.getSenderName();
    const senderFullName = this.senderSettings.getSenderFullName();
    return this.birthdayFacade.birthdays()
      .filter(b => b.scheduledMessages && b.scheduledMessages.length > 0)
      .sort((a, b) => getDaysUntilBirthday(a.birthDate) - getDaysUntilBirthday(b.birthDate))
      .map(b => ({
        birthday: b,
        messages: (b.scheduledMessages || []).map(msg => ({
          ...msg,
          wishLinks: getAvailableWishLinks(b, msg.message, senderName, senderFullName)
        }))
      }));
  });

  noBirthdays: Signal<boolean> = computed(() => this.birthdayFacade.birthdays().length === 0);

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
      restoreFocus: true,
    });
  }

  deleteMessage(birthdayId: string, messageId: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: 'min(450px, 90vw)',
      data: {
        title: 'Delete Message?',
        message: 'Are you sure you want to delete this scheduled message?',
        confirmText: 'Delete',
        icon: 'delete',
        color: 'warn'
      }
    });

    dialogRef.afterClosed().pipe(take(1)).subscribe(confirmed => {
      if (confirmed) {
        this.birthdayFacade.deleteMessageFromBirthday(birthdayId, messageId);
      }
    });
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

  private readonly senderSettings = inject(SenderSettingsService);

}
