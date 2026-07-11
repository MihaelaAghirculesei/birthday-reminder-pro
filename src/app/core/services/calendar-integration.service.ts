import { inject, Injectable } from '@angular/core';

import { type Birthday } from '../../shared/models/birthday.model';
import { FeatureFlagsService } from './feature-flags.service';
import { GoogleCalendarService } from './google-calendar.service';
import { LoggerService } from './logger.service';

@Injectable({ providedIn: 'root' })
export class CalendarIntegrationService {
  private readonly googleCalendar = inject(GoogleCalendarService);
  private readonly featureFlags = inject(FeatureFlagsService);
  private readonly logger = inject(LoggerService);

  async syncToCalendar(birthday: Birthday): Promise<string | null> {
    if (!this.featureFlags.isCalendarSyncEnabled() || !this.googleCalendar.isEnabled()) return null;
    try {
      return await this.googleCalendar.syncBirthdayToCalendar(birthday);
    } catch (error) {
      this.logger.error('[CalendarIntegrationService] Failed to sync to Google Calendar:', error);
      return null;
    }
  }

  async updateInCalendar(birthday: Birthday): Promise<void> {
    if (!birthday.googleCalendarEventId || !this.featureFlags.isCalendarSyncEnabled() || !this.googleCalendar.isEnabled()) return;
    try {
      await this.googleCalendar.updateBirthdayInCalendar(birthday, birthday.googleCalendarEventId);
    } catch (error) {
      this.logger.error('[CalendarIntegrationService] Failed to update Google Calendar:', error);
    }
  }

  async deleteFromCalendar(eventId: string): Promise<void> {
    if (!this.featureFlags.isCalendarSyncEnabled() || !this.googleCalendar.isEnabled()) return;
    try {
      await this.googleCalendar.deleteBirthdayFromCalendar(eventId);
    } catch (error) {
      this.logger.error('[CalendarIntegrationService] Failed to delete from Google Calendar:', error);
    }
  }
}
