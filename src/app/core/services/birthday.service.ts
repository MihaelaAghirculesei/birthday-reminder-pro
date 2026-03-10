import { inject, Injectable, Injector } from '@angular/core';
import { Birthday, createSyncMetadata, updateSyncMetadata } from '../../shared/models/birthday.model';
import { getZodiacSign, DEFAULT_CATEGORY } from '../../shared';
import { IdGeneratorService } from './id-generator.service';
import { GoogleCalendarService } from './google-calendar.service';
import { LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root'
})
export class BirthdayService {
  private readonly idGenerator = inject(IdGeneratorService);
  private readonly injector = inject(Injector);
  private readonly logger = inject(LoggerService);

  private _googleCalendarService: GoogleCalendarService | null = null;

  private get googleCalendarService(): GoogleCalendarService {
    if (!this._googleCalendarService) {
      this._googleCalendarService = this.injector.get(GoogleCalendarService);
    }
    return this._googleCalendarService;
  }

  prepareBirthdayForCreate(birthday: Omit<Birthday, 'id'>, userId: string | null): Birthday {
    const syncMeta = createSyncMetadata(userId);
    return {
      ...birthday,
      ...syncMeta,
      id: this.idGenerator.generateId(),
      category: this.normalizeCategoryId(birthday.category || DEFAULT_CATEGORY),
      zodiacSign: birthday.zodiacSign || getZodiacSign(birthday.birthDate).name
    } as Birthday;
  }

  prepareBirthdayForUpdate(birthday: Birthday, userId: string | null): Birthday {
    const syncMeta = updateSyncMetadata(birthday, userId);
    return {
      ...birthday,
      ...syncMeta,
      category: this.normalizeCategoryId(birthday.category)
    };
  }

  normalizeBirthdayOnLoad(birthday: Birthday): Birthday {
    return {
      ...birthday,
      zodiacSign: birthday.zodiacSign || getZodiacSign(birthday.birthDate).name,
      category: this.normalizeCategoryId(birthday.category)
    };
  }

  processTestBirthdays(birthdays: Birthday[]): Birthday[] {
    return birthdays.map(b => ({
      ...b,
      id: this.idGenerator.generateId(),
      zodiacSign: b.zodiacSign || getZodiacSign(b.birthDate).name,
      category: this.normalizeCategoryId(b.category || DEFAULT_CATEGORY),
      ...createSyncMetadata(null)
    }));
  }

  normalizeCategoryId(category?: string): string {
    if (!category) return DEFAULT_CATEGORY;

    const categoryMap: Record<string, string> = {
      'Family': 'family',
      'Friends': 'friends',
      'Work': 'colleagues',
      'Colleagues': 'colleagues',
      'Other': 'other',
      'Partner/Ex': 'romantic',
      'Romantic': 'romantic',
      'Acquaintances': 'acquaintances'
    };

    if (category === category.toLowerCase()) {
      return category;
    }

    return categoryMap[category] || category.toLowerCase();
  }

  generateId(): string {
    return this.idGenerator.generateId();
  }

  async syncToGoogleCalendar(birthday: Birthday): Promise<string | null> {
    if (this.googleCalendarService.isEnabled()) {
      try {
        return await this.googleCalendarService.syncBirthdayToCalendar(birthday);
      } catch (error) {
        this.logger.error('[BirthdayService] Failed to sync to Google Calendar:', error);
        return null;
      }
    }
    return null;
  }

  async updateGoogleCalendar(birthday: Birthday): Promise<void> {
    if (birthday.googleCalendarEventId && this.googleCalendarService.isEnabled()) {
      try {
        await this.googleCalendarService.updateBirthdayInCalendar(birthday, birthday.googleCalendarEventId);
      } catch (error) {
        this.logger.error('[BirthdayService] Failed to update Google Calendar:', error);
      }
    }
  }

  async deleteFromGoogleCalendar(eventId: string): Promise<void> {
    if (this.googleCalendarService.isEnabled()) {
      try {
        await this.googleCalendarService.deleteBirthdayFromCalendar(eventId);
      } catch (error) {
        this.logger.error('[BirthdayService] Failed to delete from Google Calendar:', error);
      }
    }
  }
}
