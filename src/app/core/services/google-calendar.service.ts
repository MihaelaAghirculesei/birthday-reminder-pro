import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { Birthday } from '../../shared';
import { environment } from '../../../environments/environment';
import type { Gapi } from './google-api.types';
import { LoggerService } from './logger.service';

declare const gapi: Gapi;

export interface GoogleCalendarSettings {
  enabled: boolean;
  calendarId: string;
  syncMode: 'one-way' | 'two-way';
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

interface GoogleAPIError {
  result?: {
    error?: {
      code?: number;
      message?: string;
    };
  };
  status?: number;
}

@Injectable({
  providedIn: 'root'
})
export class GoogleCalendarService {
  private readonly CLIENT_ID = environment.googleCalendar.clientId;
  private readonly API_KEY = environment.googleCalendar.apiKey;
  private readonly DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
  private readonly SCOPES = 'https://www.googleapis.com/auth/calendar';
  private readonly TOKEN_REFRESH_THRESHOLD_SECONDS = 300;

  private isInitialized = false;
  private isSignedInSubject = new BehaviorSubject<boolean>(false);
  private settingsSubject = new BehaviorSubject<GoogleCalendarSettings>({
    enabled: false,
    calendarId: 'primary',
    syncMode: 'one-way',
    reminderMinutes: 1440 // 1 day before
  });

  public isSignedIn$ = this.isSignedInSubject.asObservable();
  public settings$ = this.settingsSubject.asObservable();

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private logger: LoggerService
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.loadSettings();
    }
  }

  async initialize(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || this.isInitialized) {
      return;
    }

    if (this.CLIENT_ID.includes('YOUR_GOOGLE') || this.API_KEY.includes('YOUR_GOOGLE')) {
      return;
    }

    await this.loadGapi();
    await gapi.load('client:auth2', async () => {
      await gapi.client.init({
        apiKey: this.API_KEY,
        clientId: this.CLIENT_ID,
        discoveryDocs: [this.DISCOVERY_DOC],
        scope: this.SCOPES
      });

      const authInstance = this.getAuthInstance();
      this.isSignedInSubject.next(authInstance.isSignedIn.get());

      authInstance.isSignedIn.listen((isSignedIn: boolean) => {
        this.isSignedInSubject.next(isSignedIn);
      });

      this.isInitialized = true;
    });
  }

  private loadGapi(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof gapi !== 'undefined') {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.defer = true;

      script.onload = () => {
        const checkGapi = () => {
          if (typeof gapi !== 'undefined') {
            resolve();
          } else {
            setTimeout(checkGapi, 100);
          }
        };
        checkGapi();
      };

      script.onerror = () => reject(new Error('Failed to load Google API script'));

      document.head.appendChild(script);
    });
  }

  async signIn(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    await this.getAuthInstance().signIn();
  }

  async signOut(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    await this.getAuthInstance().signOut();
    this.updateSettings({ ...this.settingsSubject.value, enabled: false });
  }

  private getAuthInstance() {
    return gapi.auth2.getAuthInstance();
  }

  private async ensureValidToken(): Promise<void> {
    if (!this.isInitialized || !this.isSignedInSubject.value) {
      return;
    }

    try {
      const user = this.getAuthInstance().currentUser.get();
      const authResponse = user.getAuthResponse(true);
      const expiresIn = (authResponse.expires_at - Date.now()) / 1000;

      if (expiresIn < this.TOKEN_REFRESH_THRESHOLD_SECONDS) {
        await user.reloadAuthResponse();
      }
    } catch (error) {
      this.logger.error('Failed to refresh auth token:', error);
    }
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    await this.ensureValidToken();

    try {
      return await operation();
    } catch (error: unknown) {
      const status = this.extractErrorStatus(error);

      if (status === 401 || status === 403) {
        try {
          await this.getAuthInstance().currentUser.get().reloadAuthResponse();
          return await operation();
        } catch (retryError) {
          this.logger.error('Failed to retry operation after token refresh:', retryError);
          throw error;
        }
      }

      throw error;
    }
  }

  private extractErrorStatus(error: unknown): number | undefined {
    if (!this.isGoogleAPIError(error)) {
      return undefined;
    }

    return error.result?.error?.code || error.status;
  }

  private isGoogleAPIError(error: unknown): error is GoogleAPIError {
    return typeof error === 'object' &&
           error !== null &&
           ('result' in error || 'status' in error);
  }

  async getCalendars(): Promise<GoogleCalendarItem[]> {
    if (!this.isSignedInSubject.value) {
      throw new Error('Not signed in to Google Calendar');
    }

    return this.executeWithRetry(async () => {
      const response = await gapi.client.calendar.calendarList.list();
      return response.result.items || [];
    });
  }

  async syncBirthdayToCalendar(birthday: Birthday): Promise<string> {
    if (!this.isSignedInSubject.value || !this.settingsSubject.value.enabled) {
      throw new Error('Google Calendar sync is not enabled');
    }

    return this.executeWithRetry(async () => {
      const event = this.createBirthdayEvent(birthday);
      const response = await gapi.client.calendar.events.insert({
        calendarId: this.settingsSubject.value.calendarId,
        resource: event
      });

      if (!response.result.id) {
        throw new Error('Failed to create calendar event: No event ID returned');
      }

      return response.result.id;
    });
  }

  async updateBirthdayInCalendar(birthday: Birthday, eventId: string): Promise<void> {
    if (!this.isSignedInSubject.value || !this.settingsSubject.value.enabled) {
      throw new Error('Google Calendar sync is not enabled');
    }

    return this.executeWithRetry(async () => {
      const event = this.createBirthdayEvent(birthday);
      await gapi.client.calendar.events.update({
        calendarId: this.settingsSubject.value.calendarId,
        eventId: eventId,
        resource: event
      });
    });
  }

  async deleteBirthdayFromCalendar(eventId: string): Promise<void> {
    if (!this.isSignedInSubject.value || !this.settingsSubject.value.enabled) {
      return;
    }

    return this.executeWithRetry(async () => {
      await gapi.client.calendar.events.delete({
        calendarId: this.settingsSubject.value.calendarId,
        eventId: eventId
      });
    });
  }

  async syncAllBirthdays(birthdays: Birthday[]): Promise<{ success: number; failed: number; errors: string[] }> {
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

  private createBirthdayEvent(birthday: Birthday): CalendarEvent {
    const birthDate = birthday.birthDate;
    const currentYear = new Date().getFullYear();
    const thisYearBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());

    const eventDate = thisYearBirthday < new Date()
      ? new Date(currentYear + 1, birthDate.getMonth(), birthDate.getDate())
      : thisYearBirthday;

    const dateString = eventDate.toISOString().split('T')[0];
    const age = currentYear - birthDate.getFullYear() + (thisYearBirthday < new Date() ? 1 : 0);

    return {
      summary: `🎂 ${birthday.name}'s Birthday (${age} years)`,
      description: birthday.notes ? `Notes: ${birthday.notes}` : `${birthday.name} turns ${age} today! 🎉`,
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

  updateSettings(settings: GoogleCalendarSettings): void {
    this.settingsSubject.next(settings);
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem('googleCalendarSettings', JSON.stringify(settings));
      } catch (error) {
        this.logger.error('[GoogleCalendar] Failed to save settings:', error);
      }
    }
  }

  private loadSettings(): void {
    if (isPlatformBrowser(this.platformId)) {
      const stored = localStorage.getItem('googleCalendarSettings');
      if (stored) {
        try {
          const settings = JSON.parse(stored);
          this.settingsSubject.next(settings);
        } catch (error) {
          this.logger.error('[GoogleCalendar] Failed to load settings:', error);
        }
      }
    }
  }

  getCurrentSettings(): GoogleCalendarSettings {
    return this.settingsSubject.value;
  }

  isEnabled(): boolean {
    return this.settingsSubject.value.enabled && this.isSignedInSubject.value;
  }
}