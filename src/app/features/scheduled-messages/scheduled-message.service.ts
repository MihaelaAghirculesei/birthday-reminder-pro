import { Injectable } from '@angular/core';
import { ScheduledMessage } from '../../shared';
import { IdGeneratorService } from '../../core/services/id-generator.service';

export interface MessageTemplate {
  title: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ScheduledMessageService {
  constructor(private idGenerator: IdGeneratorService) {}

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
        title: 'Simple Happy Birthday',
        message: 'Happy birthday {name}! May these {age} years be just the beginning of a wonderful chapter. Thank you for the light you bring into the lives of those who love you. 🎉💖\n\n{sender}'
      },
      {
        title: 'Formal Message',
        message: 'Dear {name}, on this special day I wish to express my warmest wishes. May your path always be illuminated with joy and may every achievement be a source of pride. With esteem and affection.\n\n{senderFull}'
      },
      {
        title: 'Fun Message',
        message: 'Hey {name}! Today you blow out {age} candles... and I would blow out every star just to see you smile! 🥳 Age increases, but your soul remains the same: unique, special, unforgettable. 🎂✨\n\n{sender}'
      },
      {
        title: 'Zodiac Message',
        message: 'Happy birthday {name}! The sky is brighter today because you were born. As a true {zodiac}, you have that magic that few possess: the courage to be yourself. May this year bring you endless emotions. 🌟💫\n\n{sender}'
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