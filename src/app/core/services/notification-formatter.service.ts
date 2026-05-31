import { inject,Injectable } from '@angular/core';

import { type Birthday, type ScheduledMessage } from '../../shared/models';
import { parseLocalDate } from '../../shared/utils/date.utils';
import { SenderSettingsService } from './sender-settings.service';

/**
 * Pure computation service: message template formatting, age calculation,
 * notification ID generation, and next-fire date calculation.
 * No side effects, no browser/native API calls.
 */
@Injectable({ providedIn: 'root' })
export class NotificationFormatterService {
  private readonly senderSettings = inject(SenderSettingsService);

  formatMessage(template: string, birthday: Birthday): string {
    const age = this.calculateAge(birthday.birthDate);
    return template
      .replace(/\{name\}/g, birthday.name)
      .replace(/\{age\}/g, age?.toString() || '')
      .replace(/\{zodiac\}/g, birthday.zodiacSign || '')
      .replace(/\{sender\}/g, this.senderSettings.getSenderName())
      .replace(/\{senderFull\}/g, this.senderSettings.getSenderFullName() || this.senderSettings.getSenderName());
  }

  calculateAge(birthDate: string): number | null {
    const today = new Date();
    const birth = parseLocalDate(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  }

  /**
   * FNV-1a 32-bit hash — deterministic, collision-resistant notification ID.
   */
  generateNotificationId(birthdayId: string, messageId: string): number {
    const combined = `${birthdayId}-${messageId}`;
    let hash = 2166136261;
    for (let i = 0; i < combined.length; i++) {
      hash ^= combined.charCodeAt(i);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash;
  }

  getNextNotificationDate(birthday: Birthday, message: ScheduledMessage): Date | null {
    const now = new Date();
    const birthDate = parseLocalDate(birthday.birthDate);
    const [hours, minutes] = message.scheduledTime.split(':').map(Number);

    let target = new Date(
      now.getFullYear(),
      birthDate.getMonth(),
      birthDate.getDate(),
      hours, minutes, 0, 0
    );

    if (target <= now) {
      target = new Date(
        now.getFullYear() + 1,
        birthDate.getMonth(),
        birthDate.getDate(),
        hours, minutes, 0, 0
      );
    }

    return target;
  }
}
