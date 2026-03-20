import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectionStrategy, inject, DestroyRef, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LocaleService } from '../../../core/services/locale.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, of, switchMap, take } from 'rxjs';

import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Store } from '@ngrx/store';
import { ScheduledMessage, Birthday, calculateAge, WishLink, getAvailableWishLinks, ConfirmDialogComponent } from '../..';
import { ScheduledMessageService, MessageTemplate } from '../../services/scheduled-message.service';
import { NotificationService, SenderSettingsService } from '../../../core';
import { AppState } from '../../../core/store/app.state';
import * as BirthdayActions from '../../../core/store/birthday/birthday.actions';
import * as BirthdaySelectors from '../../../core/store/birthday/birthday.selectors';

interface EnrichedMessage extends ScheduledMessage {
  processedMessage: string;
  wishLinks: WishLink[];
  formattedCreatedDate: string;
  formattedLastSentDate: string | null;
}

@Component({
    selector: 'app-message-scheduler',
    imports: [
        ReactiveFormsModule,
        MatCardModule,
        MatExpansionModule,
        MatChipsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatSlideToggleModule,
        MatIconModule,
        MatButtonModule,
        MatTooltipModule,
        TranslatePipe,
    ],
    templateUrl: './message-scheduler.component.html',
    styleUrls: ['./message-scheduler.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessageSchedulerComponent implements OnInit, OnChanges {
  private readonly destroyRef = inject(DestroyRef);
  private readonly senderSettings = inject(SenderSettingsService);
  private readonly dialog = inject(MatDialog);

  @Input() birthday: Birthday | null = null;
  @Output() unsavedChanges = new EventEmitter<boolean>();

  messageForm: FormGroup;
  messages: ScheduledMessage[] = [];
  enrichedMessages = signal<EnrichedMessage[]>([]);
  templates: MessageTemplate[] = [];
  isCreatingMessage = false;
  editingMessage: ScheduledMessage | null = null;

  messagePreview = '';

  get hasAnyContact(): boolean {
    if (!this.birthday) return false;
    return !!(this.birthday.email?.trim() || this.birthday.phone?.trim() || this.birthday.telegramUsername?.trim());
  }

  private readonly store = inject(Store<AppState>);
  private readonly fb = inject(FormBuilder);
  private readonly scheduledMessageService = inject(ScheduledMessageService);
  private readonly notificationService = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly localeService = inject(LocaleService);

  private readonly birthdayId$ = new BehaviorSubject<string | null>(null);

  constructor() {
    this.messageForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      message: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(1000)]],
      scheduledTime: ['09:00', Validators.required],
      priority: ['normal', Validators.required],
      active: [true],
    });

    this.templates = this.scheduledMessageService.getMessageTemplates();
  }

  ngOnInit(): void {
    this.birthdayId$.pipe(
      switchMap(id => id
        ? this.store.select(BirthdaySelectors.selectMessagesByBirthday(id))
        : of([] as ScheduledMessage[])
      ),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(messages => {
      this.messages = messages ?? [];
      this.enrichMessages();
    });

    this.messageForm.get('message')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateMessagePreview());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['birthday']) {
      this.birthdayId$.next(this.birthday?.id ?? null);
      this.updateMessagePreview();
      this.enrichMessages();
    }
  }

  private updateMessagePreview(): void {
    const message = this.messageForm.get('message')?.value || '';
    this.messagePreview = this.birthday
      ? this.processMessage(message, this.birthday)
      : message;
  }

  startCreatingMessage(): void {
    this.isCreatingMessage = true;
    this.editingMessage = null;
    this.messageForm.reset({
      scheduledTime: '09:00',
      priority: 'normal',
      active: true,
    });
    this.unsavedChanges.emit(true);
  }

  applyTemplate(template: MessageTemplate): void {
    this.messageForm.patchValue({
      title: template.title,
      message: template.message,
    });
  }

  saveMessage(): void {
    if (this.messageForm.valid && this.birthday) {
      if (this.editingMessage) {
        this.store.dispatch(BirthdayActions.updateMessageInBirthday({
          birthdayId: this.birthday.id,
          messageId: this.editingMessage.id,
          updates: this.messageForm.value
        }));
        this.notificationService.show(this.translate.instant('MESSAGE_SCHEDULER.MESSAGE_UPDATED'), 'success');
      } else {
        const newMessage = this.scheduledMessageService.createMessage({
          ...this.messageForm.value,
          birthdayId: this.birthday.id
        });

        this.store.dispatch(BirthdayActions.addMessageToBirthday({
          birthdayId: this.birthday.id,
          message: newMessage
        }));
        this.notificationService.show(this.translate.instant('MESSAGE_SCHEDULER.MESSAGE_CREATED'), 'success');
      }

      this.cancelEdit();
      this.unsavedChanges.emit(false);
    }
  }

  editMessage(message: ScheduledMessage): void {
    this.editingMessage = message;
    this.isCreatingMessage = true;
    this.messageForm.patchValue(message);
    this.unsavedChanges.emit(true);
  }

  cancelEdit(): void {
    this.isCreatingMessage = false;
    this.editingMessage = null;
    this.messageForm.reset();
    this.unsavedChanges.emit(false);
  }

  toggleMessageStatus(message: ScheduledMessage): void {
    if (this.birthday) {
      this.store.dispatch(BirthdayActions.updateMessageInBirthday({
        birthdayId: this.birthday.id,
        messageId: message.id,
        updates: { active: !message.active }
      }));
    }
  }

  testMessage(message: ScheduledMessage): void {
    if (this.birthday) {
      const processedMessage = this.processMessage(message.message, this.birthday);
      this.notificationService.show(
        `🧪 TEST - ${message.title}: ${processedMessage}`,
        'info'
      );
    }
  }

  deleteMessage(message: ScheduledMessage): void {
    if (!this.birthday) return;

    const birthdayId = this.birthday.id;
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: 'min(450px, 90vw)',
      data: {
        title: this.translate.instant('MESSAGE_SCHEDULER.DELETE_TITLE'),
        message: this.translate.instant('MESSAGE_SCHEDULER.DELETE_CONFIRM', { title: message.title }),
        confirmText: this.translate.instant('CONFIRM.DELETE_BTN'),
        icon: 'delete',
        color: 'warn'
      }
    });

    dialogRef.afterClosed().pipe(take(1)).subscribe(confirmed => {
      if (confirmed) {
        this.store.dispatch(BirthdayActions.deleteMessageFromBirthday({
          birthdayId,
          messageId: message.id
        }));
        this.notificationService.show(this.translate.instant('MESSAGE_SCHEDULER.MESSAGE_DELETED'), 'success');
      }
    });
  }

  private enrichMessages(): void {
    if (!this.birthday) {
      this.enrichedMessages.set([]);
      return;
    }
    const senderName = this.senderSettings.getSenderName();
    const senderFullName = this.senderSettings.getSenderFullName();
    this.enrichedMessages.set(this.messages.map(msg => ({
      ...msg,
      processedMessage: this.processMessage(msg.message, this.birthday!),
      wishLinks: getAvailableWishLinks(this.birthday!, msg.message, senderName, senderFullName),
      formattedCreatedDate: this.formatDate(msg.createdDate),
      formattedLastSentDate: msg.lastSentDate ? this.formatDate(msg.lastSentDate) : null
    })));
  }

  private processMessage(template: string, birthday: Birthday): string {
    return template
      .replace(/\{name\}/g, birthday.name)
      .replace(/\{age\}/g, calculateAge(birthday.birthDate).toString())
      .replace(/\{zodiac\}/g, birthday.zodiacSign || '')
      .replace(/\{sender\}/g, this.senderSettings.getSenderName())
      .replace(/\{senderFull\}/g, this.senderSettings.getSenderFullName() || this.senderSettings.getSenderName());
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat(this.localeService.currentLocale(), {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  }

  trackByMessageId(_index: number, message: ScheduledMessage): string {
    return message.id;
  }

}
