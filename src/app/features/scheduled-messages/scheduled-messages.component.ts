import { Component, ChangeDetectionStrategy, computed, Signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { take } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { Birthday, ScheduledMessage, WishLink, getAvailableWishLinks, ConfirmDialogComponent } from '../../shared';
import { getDaysUntilBirthday } from '../../shared/utils/date.utils';
import { SenderSettingsService } from '../../core';
import { MessageScheduleDialogComponent } from './message-schedule-dialog/message-schedule-dialog.component';
import { AppState } from '../../core/store/app.state';
import * as BirthdayActions from '../../core/store/birthday/birthday.actions';
import * as BirthdaySelectors from '../../core/store/birthday/birthday.selectors';

interface EnrichedMessage extends ScheduledMessage {
  wishLinks: WishLink[];
  priorityLabel: string;
}

interface BirthdayMessageView {
  birthday: Birthday;
  messages: EnrichedMessage[];
}

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High'
};

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
  private readonly store = inject(Store<AppState>);
  private readonly dialog = inject(MatDialog);
  private readonly senderSettings = inject(SenderSettingsService);

  private readonly birthdays = toSignal(
    this.store.select(BirthdaySelectors.selectAllBirthdays),
    { initialValue: [] }
  );

  birthdaysWithMessages: Signal<BirthdayMessageView[]> = computed(() => {
    const senderName = this.senderSettings.getSenderName();
    const senderFullName = this.senderSettings.getSenderFullName();
    return this.birthdays()
      .filter(b => b.scheduledMessages && b.scheduledMessages.length > 0)
      .sort((a, b) => getDaysUntilBirthday(a.birthDate) - getDaysUntilBirthday(b.birthDate))
      .map(b => ({
        birthday: b,
        messages: (b.scheduledMessages || []).map(msg => ({
          ...msg,
          wishLinks: getAvailableWishLinks(b, msg.message, senderName, senderFullName),
          priorityLabel: PRIORITY_LABELS[msg.priority] || msg.priority
        }))
      }));
  });

  noBirthdays: Signal<boolean> = computed(() => this.birthdays().length === 0);

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
        this.store.dispatch(BirthdayActions.deleteMessageFromBirthday({ birthdayId, messageId }));
      }
    });
  }

  trackByBirthday(_index: number, birthday: Birthday): string {
    return birthday.id;
  }

  trackByMessage(_index: number, message: ScheduledMessage): string {
    return message.id;
  }

}
