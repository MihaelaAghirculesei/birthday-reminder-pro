import { ChangeDetectionStrategy, Component, computed, inject,type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Store } from '@ngrx/store';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { take } from 'rxjs';

import { SenderSettingsService } from '../../core';
import { type AppState } from '../../core/store/app.state';
import * as BirthdayActions from '../../core/store/birthday/birthday.actions';
import * as BirthdaySelectors from '../../core/store/birthday/birthday.selectors';
import { type Birthday, ConfirmDialogComponent,getAvailableWishLinks, type ScheduledMessage, type WishLink } from '../../shared';
import { LocalDatePipe } from '../../shared/pipes/local-date.pipe';
import { LocaleDatePipe } from '../../shared/pipes/locale-date.pipe';
import { getDaysUntilBirthday } from '../../shared/utils/date';
import { MessageScheduleDialogComponent } from './message-schedule-dialog/message-schedule-dialog.component';

interface ScheduledMessageView extends ScheduledMessage {
  wishLinks: WishLink[];
  priorityLabel: string;
}

interface BirthdayMessageView {
  birthday: Birthday;
  messages: ScheduledMessageView[];
}

const PRIORITY_KEYS: Record<string, string> = {
  low: 'MESSAGE_SCHEDULER.PRIORITY_LOW',
  normal: 'MESSAGE_SCHEDULER.PRIORITY_NORMAL',
  high: 'MESSAGE_SCHEDULER.PRIORITY_HIGH'
};

@Component({
    selector: 'app-scheduled-messages',
    imports: [
        MatCardModule,
        MatIconModule,
        MatButtonModule,
        MatTooltipModule,
        LocalDatePipe,
        TranslatePipe,
        LocaleDatePipe,
    ],
    templateUrl: './scheduled-messages.component.html',
    styleUrls: ['./scheduled-messages.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScheduledMessagesComponent {
  private readonly store = inject(Store<AppState>);
  private readonly dialog = inject(MatDialog);
  private readonly senderSettings = inject(SenderSettingsService);
  private readonly translate = inject(TranslateService);

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
          priorityLabel: this.translate.instant(PRIORITY_KEYS[msg.priority] || msg.priority)
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
        title: this.translate.instant('SCHEDULED_MESSAGES.DELETE_TITLE'),
        message: this.translate.instant('SCHEDULED_MESSAGES.DELETE_CONFIRM'),
        confirmText: this.translate.instant('CONFIRM.DELETE_BTN'),
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
