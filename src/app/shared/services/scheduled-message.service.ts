import { inject,Injectable } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

import { IdGeneratorService } from '../../core/services/id-generator.service';
import { type ScheduledMessage } from '../models';

export interface MessageTemplate {
  title: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ScheduledMessageService {
  private readonly idGenerator = inject(IdGeneratorService);
  private readonly translate = inject(TranslateService);

  createMessage(messageData: Partial<ScheduledMessage>): ScheduledMessage {
    return {
      id: this.idGenerator.generateId(),
      title: messageData.title || '',
      message: messageData.message || '',
      scheduledTime: messageData.scheduledTime || '09:00',
      active: messageData.active ?? true,
      createdDate: new Date(),
      messageType: messageData.messageType || 'text',
      priority: messageData.priority || 'normal',
      birthdayId: messageData.birthdayId
    };
  }

  getMessageTemplates(): MessageTemplate[] {
    return [
      {
        title: this.translate.instant('MESSAGE_TEMPLATES.SIMPLE_TITLE'),
        message: this.translate.instant('MESSAGE_TEMPLATES.SIMPLE_MSG')
      },
      {
        title: this.translate.instant('MESSAGE_TEMPLATES.FORMAL_TITLE'),
        message: this.translate.instant('MESSAGE_TEMPLATES.FORMAL_MSG')
      },
      {
        title: this.translate.instant('MESSAGE_TEMPLATES.FUN_TITLE'),
        message: this.translate.instant('MESSAGE_TEMPLATES.FUN_MSG')
      },
      {
        title: this.translate.instant('MESSAGE_TEMPLATES.ZODIAC_TITLE'),
        message: this.translate.instant('MESSAGE_TEMPLATES.ZODIAC_MSG')
      }
    ];
  }

  getTimeSlots(): string[] {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    return slots;
  }
}
