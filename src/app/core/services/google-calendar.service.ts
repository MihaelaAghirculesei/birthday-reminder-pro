import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

import { BehaviorSubject } from 'rxjs';

import { environment } from '../../../environments/environment';
import { type Birthday } from '../../shared';
import type { Gapi } from './google-api.types';
import { GoogleApiErrorService } from './google-api-error.service';
import { GoogleApiLoaderService } from './google-api-loader.service';
import { GoogleCalendarAuthService } from './google-calendar-auth.service';
import { LoggerService } from './logger.service';

declare const gapi: Gapi;

export interface GoogleCalendarSettings {
  enabled: boolean;
  calendarId: string;
  reminderMinutes: number;
}

export interface GoogleCalendarItem {
  id: string;
  summary: string;
}

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: { date: string };
  end: { date: string };
  recurrence?: string[];
  reminders?: {
    useDefault: boolean;
    overrides?: { method: string; minutes: number }[];
  };
}

const STORAGE_KEY_SETTINGS = 'googleCalendarSettings';

/**
 * Public facade for Google Calendar integration.
 * Delegates script loading to GoogleApiLoaderService and the OAuth token
 * lifecycle to GoogleCalendarAuthService; owns settings persistence and
 * calendar CRUD operations.
 */
@Injectable({ providedIn: 'root' })
export class GoogleCalendarService {
  private readonly CLIENT_ID = environment.googleCalendar.clientId;
  private readonly DISCOVERY_DOC =
    'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
  private readonly SCOPES = 'https://www.googleapis.com/auth/calendar';

  private readonly platformId = inject(PLATFORM_ID);
  private readonly logger = inject(LoggerService);
  private readonly errorService = inject(GoogleApiErrorService);
  private readonly loader = inject(GoogleApiLoaderService);
  private readonly auth = inject(GoogleCalendarAuthService);

  private readonly _schemas = import('../../shared/schemas/birthday.schema');

  private readonly settingsSubject = new BehaviorSubject<GoogleCalendarSettings>({
    enabled: false,
    calendarId: 'primary',
    reminderMinutes: 1440
  });

  readonly isSignedIn$ = this.auth.isSignedIn$;
  readonly settings$ = this.settingsSubject.asObservable();

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadSettings();
      this.auth.restoreSession(this.loader.isGapiLoaded);
    }
  }

  async initialize(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.CLIENT_ID.includes('YOUR_GOOGLE')) return;

    await Promise.all([this.loader.loadGapiScript(), this.loader.loadGisScript()]);
    await this.loader.initGapiClient(this.DISCOVERY_DOC);
    this.auth.initTokenClient(this.CLIENT_ID, this.SCOPES);
    await this.auth.restoreSession(this.loader.isGapiLoaded);
  }

  async signIn(): Promise<void> {
    if (!this.loader.isGisLoaded || !this.loader.isGapiLoaded) {
      await this.initialize();
    }
    return this.auth.signIn(this.CLIENT_ID);
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
    this.updateSettings({ ...this.settingsSubject.value, enabled: false });
  }

  async getCalendars(): Promise<GoogleCalendarItem[]> {
    if (!this.auth.isSignedIn) {
      throw new Error('Not signed in to Google Calendar');
    }

    return this.executeWithRetry(async () => {
      const response = await gapi.client.calendar.calendarList.list();
      const items = response.result.items || [];
      const { safeParseCalendarItems } = await this._schemas;
      const result = safeParseCalendarItems(items);
      if (!result.success) {
        this.logger.warn(
          '[GoogleCalendar] Invalid calendar list response, returning raw items:',
          result.error.issues
        );
        return items;
      }
      return result.data;
    }, 'getCalendars');
  }

  async syncBirthdayToCalendar(birthday: Birthday): Promise<string> {
    if (!this.auth.isSignedIn || !this.settingsSubject.value.enabled) {
      throw new Error('Google Calendar sync is not enabled');
    }

    return this.executeWithRetry(async () => {
      const event = this.createBirthdayEvent(birthday);
      const response = await gapi.client.calendar.events.insert({
        calendarId: this.settingsSubject.value.calendarId,
        resource: event
      });

      const { safeParseEventResponse } = await this._schemas;
      const result = safeParseEventResponse(response.result);
      if (!result.success) {
        throw new Error('Failed to create calendar event: invalid response from Google API');
      }
      return result.data.id;
    }, `syncBirthday:${birthday.name}`);
  }

  async updateBirthdayInCalendar(birthday: Birthday, eventId: string): Promise<void> {
    if (!this.auth.isSignedIn || !this.settingsSubject.value.enabled) {
      throw new Error('Google Calendar sync is not enabled');
    }

    return this.executeWithRetry(async () => {
      const event = this.createBirthdayEvent(birthday);
      await gapi.client.calendar.events.update({
        calendarId: this.settingsSubject.value.calendarId,
        eventId,
        resource: event
      });
    }, `updateBirthday:${birthday.name}`);
  }

  async deleteBirthdayFromCalendar(eventId: string): Promise<void> {
    if (!this.auth.isSignedIn || !this.settingsSubject.value.enabled) return;

    return this.executeWithRetry(async () => {
      await gapi.client.calendar.events.delete({
        calendarId: this.settingsSubject.value.calendarId,
        eventId
      });
    }, `deleteEvent:${eventId}`);
  }

  async syncAllBirthdays(
    birthdays: Birthday[]
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = { success: 0, failed: 0, errors: [] as string[] };
    for (const birthday of birthdays) {
      try {
        await this.syncBirthdayToCalendar(birthday);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`${birthday.name}: ${(error as Error).message}`);
      }
    }
    return results;
  }

  updateSettings(settings: GoogleCalendarSettings): void {
    this.settingsSubject.next(settings);
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
      } catch (error) {
        this.logger.error('[GoogleCalendar] Failed to save settings:', error);
      }
    }
  }

  getCurrentSettings(): GoogleCalendarSettings {
    return this.settingsSubject.value;
  }

  isEnabled(): boolean {
    return this.settingsSubject.value.enabled && this.auth.isSignedIn;
  }

  isInitialized(): boolean {
    return this.loader.isGapiLoaded && this.loader.isGisLoaded && this.auth.tokenClient !== null;
  }

  private async loadSettings(): Promise<void> {
    const stored = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      const { safeParseGoogleCalendarSettings } = await this._schemas;
      const result = safeParseGoogleCalendarSettings(parsed);
      if (result.success) {
        this.settingsSubject.next(result.data);
      } else {
        this.logger.warn(
          '[GoogleCalendar] Invalid stored settings, using defaults:',
          result.error.issues
        );
        localStorage.removeItem(STORAGE_KEY_SETTINGS);
      }
    } catch (error) {
      this.logger.error('[GoogleCalendar] Failed to load settings:', error);
    }
  }

  private createBirthdayEvent(birthday: Birthday): CalendarEvent {
    const [year, month, day] = birthday.birthDate.split('-').map(Number);
    const currentYear = new Date().getFullYear();
    const thisYearBirthday = new Date(currentYear, month - 1, day);
    const eventDate =
      thisYearBirthday < new Date()
        ? new Date(currentYear + 1, month - 1, day)
        : thisYearBirthday;

    const dateString = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;
    const age = currentYear - year + (thisYearBirthday < new Date() ? 1 : 0);

    return {
      summary: `🎂 ${birthday.name}'s Birthday (${age} years)`,
      description: birthday.notes
        ? `Notes: ${birthday.notes}`
        : `${birthday.name} turns ${age} today! 🎉`,
      start: { date: dateString },
      end: { date: dateString },
      recurrence: ['RRULE:FREQ=YEARLY'],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: this.settingsSubject.value.reminderMinutes },
          { method: 'popup', minutes: this.settingsSubject.value.reminderMinutes }
        ]
      }
    };
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string,
    maxRetries = 2
  ): Promise<T> {
    await this.auth.ensureValidToken();

    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: unknown) {
        lastError = error;
        const errorDetails = this.errorService.parseError(error, context);

        if (this.errorService.isAuthError(errorDetails.code)) {
          try {
            await this.auth.refreshTokenSilently();
            continue;
          } catch {
            throw this.errorService.createError(errorDetails, context);
          }
        }

        if (this.errorService.isRateLimitError(errorDetails.code)) {
          const delay = Math.pow(2, attempt) * 1000;
          this.logger.warn(`[GoogleCalendar] Rate limited, waiting ${delay}ms before retry...`);
          await this.delay(delay);
          continue;
        }

        if (this.errorService.isServerError(errorDetails.code) && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 500;
          this.logger.warn(`[GoogleCalendar] Server error, retrying in ${delay}ms...`);
          await this.delay(delay);
          continue;
        }

        throw this.errorService.createError(errorDetails, context);
      }
    }

    const finalError = this.errorService.parseError(lastError, context);
    throw this.errorService.createError(finalError, context);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
