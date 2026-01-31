import { Injectable, Inject, PLATFORM_ID, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { Birthday } from '../../shared';
import { environment } from '../../../environments/environment';
import type { Gapi } from './google-api.types';
import type { TokenClient, TokenResponse } from './google-identity.types';
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

interface StoredToken {
  access_token: string;
  expires_at: number;
}

const STORAGE_KEY_TOKEN = 'googleCalendarToken';
const STORAGE_KEY_SETTINGS = 'googleCalendarSettings';

@Injectable({
  providedIn: 'root'
})
export class GoogleCalendarService {
  private readonly CLIENT_ID = environment.googleCalendar.clientId;
  private readonly DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
  private readonly SCOPES = 'https://www.googleapis.com/auth/calendar';
  private readonly TOKEN_REFRESH_THRESHOLD_SECONDS = 300;

  private isGapiLoaded = false;
  private isGisLoaded = false;
  private tokenClient: TokenClient | null = null;
  private pendingTokenPromise: {
    resolve: (token: string) => void;
    reject: (error: Error) => void;
  } | null = null;

  private isSignedInSubject = new BehaviorSubject<boolean>(false);
  private settingsSubject = new BehaviorSubject<GoogleCalendarSettings>({
    enabled: false,
    calendarId: 'primary',
    syncMode: 'one-way',
    reminderMinutes: 1440
  });

  public isSignedIn$ = this.isSignedInSubject.asObservable();
  public settings$ = this.settingsSubject.asObservable();

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private ngZone: NgZone,
    private logger: LoggerService
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.loadSettings();
      this.restoreSession();
    }
  }

  async initialize(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.CLIENT_ID.includes('YOUR_GOOGLE')) {
      return;
    }

    await Promise.all([
      this.loadGapiScript(),
      this.loadGisScript()
    ]);

    await this.initializeGapiClient();
    this.initializeTokenClient();

    await this.restoreSession();
  }

  private loadGapiScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isGapiLoaded || typeof gapi !== 'undefined') {
        this.isGapiLoaded = true;
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
            this.isGapiLoaded = true;
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

  private loadGisScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isGisLoaded || (window.google && window.google.accounts)) {
        this.isGisLoaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;

      script.onload = () => {
        const checkGis = () => {
          if (window.google && window.google.accounts) {
            this.isGisLoaded = true;
            resolve();
          } else {
            setTimeout(checkGis, 100);
          }
        };
        checkGis();
      };

      script.onerror = () => reject(new Error('Failed to load Google Identity Services script'));

      document.head.appendChild(script);
    });
  }

  private async initializeGapiClient(): Promise<void> {
    return new Promise((resolve, reject) => {
      gapi.load('client', async () => {
        try {
          await gapi.client.init({
            discoveryDocs: [this.DISCOVERY_DOC]
          });
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  private initializeTokenClient(): void {
    if (!window.google || !window.google.accounts) {
      throw new Error('Google Identity Services not loaded');
    }

    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: this.CLIENT_ID,
      scope: this.SCOPES,
      callback: (response: TokenResponse) => {
        this.ngZone.run(() => {
          this.handleTokenResponse(response);
        });
      },
      error_callback: (error: { type: string; message: string }) => {
        this.ngZone.run(() => {
          this.logger.error('[GoogleCalendar] Token error:', error);
          if (this.pendingTokenPromise) {
            this.pendingTokenPromise.reject(new Error(error.message || 'Token request failed'));
            this.pendingTokenPromise = null;
          }
        });
      }
    });
  }

  private handleTokenResponse(response: TokenResponse): void {
    if (response.error) {
      this.logger.error('[GoogleCalendar] Token response error:', response.error_description);
      if (this.pendingTokenPromise) {
        this.pendingTokenPromise.reject(new Error(response.error_description || response.error));
        this.pendingTokenPromise = null;
      }
      return;
    }

    const expiresAt = Date.now() + (response.expires_in * 1000);
    this.saveToken(response.access_token, expiresAt);

    gapi.client.setToken({ access_token: response.access_token });
    this.isSignedInSubject.next(true);

    if (this.pendingTokenPromise) {
      this.pendingTokenPromise.resolve(response.access_token);
      this.pendingTokenPromise = null;
    }
  }

  private saveToken(accessToken: string, expiresAt: number): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      const tokenData: StoredToken = { access_token: accessToken, expires_at: expiresAt };
      localStorage.setItem(STORAGE_KEY_TOKEN, JSON.stringify(tokenData));
    } catch (error) {
      this.logger.error('[GoogleCalendar] Failed to save token:', error);
    }
  }

  private getStoredToken(): StoredToken | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY_TOKEN);
      if (stored) {
        return JSON.parse(stored) as StoredToken;
      }
    } catch (error) {
      this.logger.error('[GoogleCalendar] Failed to load token:', error);
    }
    return null;
  }

  private clearStoredToken(): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.removeItem(STORAGE_KEY_TOKEN);
      } catch (error) {
        this.logger.error('[GoogleCalendar] Failed to clear token:', error);
      }
    }
  }

  private async restoreSession(): Promise<void> {
    const storedToken = this.getStoredToken();
    if (!storedToken) {
      return;
    }

    const now = Date.now();
    const expiresIn = (storedToken.expires_at - now) / 1000;

    if (expiresIn <= 0) {
      this.clearStoredToken();
      return;
    }

    if (this.isGapiLoaded && typeof gapi !== 'undefined' && gapi.client) {
      gapi.client.setToken({ access_token: storedToken.access_token });
      this.isSignedInSubject.next(true);

      if (expiresIn < this.TOKEN_REFRESH_THRESHOLD_SECONDS) {
        await this.refreshTokenSilently();
      }
    }
  }

  async signIn(): Promise<void> {
    if (!this.isGisLoaded || !this.isGapiLoaded) {
      await this.initialize();
    }

    if (!this.tokenClient) {
      if (this.CLIENT_ID.includes('YOUR_GOOGLE')) {
        throw new Error('Google Calendar not configured. Please set a valid Client ID in environment.ts');
      }
      throw new Error('Token client not initialized');
    }

    return new Promise((resolve, reject) => {
      this.pendingTokenPromise = { resolve: () => resolve(), reject };
      this.tokenClient!.requestAccessToken({ prompt: 'consent' });
    });
  }

  async signOut(): Promise<void> {
    const token = gapi.client.getToken();

    if (token && token.access_token && window.google && window.google.accounts) {
      window.google.accounts.oauth2.revoke(token.access_token, () => {
        this.ngZone.run(() => {
          this.logger.info('[GoogleCalendar] Token revoked');
        });
      });
    }

    gapi.client.setToken(null);
    this.clearStoredToken();
    this.isSignedInSubject.next(false);
    this.updateSettings({ ...this.settingsSubject.value, enabled: false });
  }

  private async refreshTokenSilently(): Promise<void> {
    if (!this.tokenClient) {
      return;
    }

    return new Promise((resolve) => {
      this.pendingTokenPromise = {
        resolve: () => resolve(),
        reject: () => {
          this.logger.warn('[GoogleCalendar] Silent refresh failed, will require interactive sign-in');
          resolve();
        }
      };

      this.tokenClient!.requestAccessToken({ prompt: '' });
    });
  }

  private async ensureValidToken(): Promise<void> {
    if (!this.isSignedInSubject.value) {
      return;
    }

    const storedToken = this.getStoredToken();
    if (!storedToken) {
      return;
    }

    const expiresIn = (storedToken.expires_at - Date.now()) / 1000;

    if (expiresIn < this.TOKEN_REFRESH_THRESHOLD_SECONDS) {
      await this.refreshTokenSilently();
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
          await this.refreshTokenSilently();
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
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
      } catch (error) {
        this.logger.error('[GoogleCalendar] Failed to save settings:', error);
      }
    }
  }

  private loadSettings(): void {
    if (isPlatformBrowser(this.platformId)) {
      const stored = localStorage.getItem(STORAGE_KEY_SETTINGS);
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

  isInitialized(): boolean {
    return this.isGapiLoaded && this.isGisLoaded && this.tokenClient !== null;
  }
}
