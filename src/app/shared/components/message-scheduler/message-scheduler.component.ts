import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectionStrategy, ChangeDetectorRef, inject, DestroyRef } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { take } from 'rxjs';

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
import { ScheduledMessage, Birthday, calculateAge, WishLink, getAvailableWishLinks, ConfirmDialogComponent } from '../..';
import { ScheduledMessageService, MessageTemplate } from '../../../features/scheduled-messages/scheduled-message.service';
import { NotificationService, BirthdayFacadeService, SenderSettingsService } from '../../../core';

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
        MatTooltipModule
    ],
    templateUrl: './message-scheduler.component.html',
    styleUrls: ['./message-scheduler.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessageSchedulerComponent implements OnInit, OnChanges {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly senderSettings = inject(SenderSettingsService);
  private readonly dialog = inject(MatDialog);

  @Input() birthday: Birthday | null = null;
  @Output() unsavedChanges = new EventEmitter<boolean>();

  messageForm: FormGroup;
  messages: ScheduledMessage[] = [];
  templates: MessageTemplate[] = [];
  timeSlots: string[] = [];
  isCreatingMessage = false;
  editingMessage: ScheduledMessage | null = null;

  messagePreview = '';

  constructor(
    private fb: FormBuilder,
    private scheduledMessageService: ScheduledMessageService,
    private notificationService: NotificationService,
    private birthdayFacade: BirthdayFacadeService
  ) {
    this.messageForm = this.fb.group({
      title: ['', Validators.required],
      message: ['', Validators.required],
      scheduledTime: ['09:00', Validators.required],
      priority: ['normal', Validators.required],
      active: [true],
    });

    this.templates = this.scheduledMessageService.getMessageTemplates();
    this.timeSlots = this.scheduledMessageService.getTimeSlots();
  }

  ngOnInit(): void {
    this.loadMessages();

    this.messageForm.get('message')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.updateMessagePreview();
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['birthday']) {
      this.updateMessagePreview();
    }
  }

  private updateMessagePreview(): void {
    const message = this.messageForm.get('message')?.value || '';
    this.messagePreview = this.birthday
      ? this.processMessage(message, this.birthday)
      : message;
  }

  loadMessages(): void {
    if (this.birthday) {
      this.birthdayFacade.getMessagesByBirthday(this.birthday.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(messages => {
          this.messages = messages || [];
          this.cdr.markForCheck();
        });
    }
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

  async saveMessage(): Promise<void> {
    if (this.messageForm.valid && this.birthday) {
      if (this.editingMessage) {
        await this.birthdayFacade.updateMessageInBirthday(
          this.birthday.id,
          this.editingMessage.id,
          this.messageForm.value
        );
        this.notificationService.show('Message updated!', 'success');
      } else {
        const newMessage = this.scheduledMessageService.createMessage({
          ...this.messageForm.value,
          birthdayId: this.birthday.id
        });

        await this.birthdayFacade.addMessageToBirthday(this.birthday.id, newMessage);
        this.notificationService.show('Scheduled message created!', 'success');
      }

      this.loadMessages();
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

  async toggleMessageStatus(message: ScheduledMessage): Promise<void> {
    if (this.birthday) {
      await this.birthdayFacade.updateMessageInBirthday(this.birthday.id, message.id, {
        active: !message.active,
      });
      this.loadMessages();
    }
  }

  testMessage(message: ScheduledMessage): void {
    if (this.birthday) {
      const processedMessage = this.getProcessedMessage(message);
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
        title: 'Delete Message?',
        message: `Are you sure you want to delete "${message.title}"?`,
        confirmText: 'Delete',
        icon: 'delete',
        color: 'warn'
      }
    });

    dialogRef.afterClosed().pipe(take(1)).subscribe(async confirmed => {
      if (confirmed) {
        await this.birthdayFacade.deleteMessageFromBirthday(birthdayId, message.id);
        this.loadMessages();
        this.notificationService.show('Message deleted', 'success');
      }
    });
  }

  getProcessedMessage(message: ScheduledMessage): string {
    return this.birthday
      ? this.processMessage(message.message, this.birthday)
      : message.message;
  }

  private processMessage(template: string, birthday: Birthday): string {
    return template
      .replace(/\{name\}/g, birthday.name)
      .replace(/\{age\}/g, calculateAge(birthday.birthDate).toString())
      .replace(/\{zodiac\}/g, birthday.zodiacSign || '')
      .replace(/\{sender\}/g, this.senderSettings.getSenderName())
      .replace(/\{senderFull\}/g, this.senderSettings.getSenderFullName() || this.senderSettings.getSenderName());
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('it-IT', {
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

  trackByTemplate(index: number, template: MessageTemplate): string {
    return template.title || index.toString();
  }

  trackByIndex(index: number): number {
    return index;
  }

  getWishLinks(message: ScheduledMessage): WishLink[] {
    if (!this.birthday) return [];
    return getAvailableWishLinks(this.birthday, message.message, this.senderSettings.getSenderName(), this.senderSettings.getSenderFullName());
  }

  safeUrl(url: string): SafeUrl {
    return this.sanitizer.bypassSecurityTrustUrl(url);
  }
}
