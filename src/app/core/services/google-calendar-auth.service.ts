import { Injectable, inject, PLATFORM_ID, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import type { TokenClient, TokenResponse } from './google-identity.types';
import type { Gapi } from './google-api.types';
import { LoggerService } from './logger.service';
import { SecureStorageService } from './secure-storage.service';

declare const gapi: Gapi;

interface StoredToken {
  access_token: string;
  expires_at: number;
}

const STORAGE_KEY_TOKEN = 'googleCalendarToken';
const TOKEN_REFRESH_THRESHOLD_SECONDS = 300;

/**
 * Owns the full OAuth token lifecycle for Google Calendar:
 * token client initialisation, token storage/retrieval, session restore,
 * silent refresh, sign-in, and sign-out.
 */
@Injectable({ providedIn: 'root' })
export class GoogleCalendarAuthService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly ngZone = inject(NgZone);
  private readonly logger = inject(LoggerService);
  private readonly secureStorage = inject(SecureStorageService);

  /** Exposed so GoogleCalendarService can pass it to GIS when needed. */
  tokenClient: TokenClient | null = null;

  /**
   * Holds the resolve/reject for the currently pending signIn or silent-refresh
   * Promise so that the GIS callback can settle it.
   */
  pendingTokenPromise: {
    resolve: (token: string) => void;
    reject: (error: Error) => void;
  } | null = null;

  private readonly isSignedInSubject = new BehaviorSubject<boolean>(false);
  readonly isSignedIn$ = this.isSignedInSubject.asObservable();

  get isSignedIn(): boolean {
    return this.isSignedInSubject.value;
  }

  /**
   * Initialises the GIS token client. Must be called after the GIS script
   * has loaded.
   */
  initTokenClient(clientId: string, scopes: string): void {
    if (!window.google || !window.google.accounts) {
      throw new Error('Google Identity Services not loaded');
    }

    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: scopes,
      callback: (response: TokenResponse) => {
        this.ngZone.run(() => { this.handleTokenResponse(response); });
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

  async handleTokenResponse(response: TokenResponse): Promise<void> {
    if (response.error) {
      this.logger.error('[GoogleCalendar] Token response error:', response.error_description);
      if (this.pendingTokenPromise) {
        this.pendingTokenPromise.reject(
          new Error(response.error_description || response.error)
        );
        this.pendingTokenPromise = null;
      }
      return;
    }

    const expiresAt = Date.now() + response.expires_in * 1000;
    await this.saveToken(response.access_token, expiresAt);

    gapi.client.setToken({ access_token: response.access_token });
    this.isSignedInSubject.next(true);

    if (this.pendingTokenPromise) {
      this.pendingTokenPromise.resolve(response.access_token);
      this.pendingTokenPromise = null;
    }
  }

  async saveToken(accessToken: string, expiresAt: number): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const tokenData: StoredToken = { access_token: accessToken, expires_at: expiresAt };
      await this.secureStorage.setItem(STORAGE_KEY_TOKEN, tokenData);
      this.logger.info('[GoogleCalendar] Token saved securely (encrypted)');
    } catch (error) {
      this.logger.error('[GoogleCalendar] Failed to save token:', error);
    }
  }

  async getStoredToken(): Promise<StoredToken | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      return await this.secureStorage.getItem<StoredToken>(STORAGE_KEY_TOKEN);
    } catch (error) {
      this.logger.error('[GoogleCalendar] Failed to load token:', error);
      return null;
    }
  }

  async clearStoredToken(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      await this.secureStorage.removeItem(STORAGE_KEY_TOKEN);
    } catch (error) {
      this.logger.error('[GoogleCalendar] Failed to clear token:', error);
    }
  }

  async restoreSession(isGapiLoaded: boolean): Promise<void> {
    const storedToken = await this.getStoredToken();
    if (!storedToken) return;

    const expiresIn = (storedToken.expires_at - Date.now()) / 1000;
    if (expiresIn <= 0) {
      await this.clearStoredToken();
      return;
    }

    if (isGapiLoaded && typeof gapi !== 'undefined' && gapi.client) {
      gapi.client.setToken({ access_token: storedToken.access_token });
      this.isSignedInSubject.next(true);

      if (expiresIn < TOKEN_REFRESH_THRESHOLD_SECONDS) {
        await this.refreshTokenSilently();
      }
    }
  }

  async refreshTokenSilently(): Promise<void> {
    if (!this.tokenClient) return;

    return new Promise(resolve => {
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

  async ensureValidToken(): Promise<void> {
    if (!this.isSignedInSubject.value) return;

    const storedToken = await this.getStoredToken();
    if (!storedToken) return;

    const expiresIn = (storedToken.expires_at - Date.now()) / 1000;
    if (expiresIn < TOKEN_REFRESH_THRESHOLD_SECONDS) {
      await this.refreshTokenSilently();
    }
  }

  async signIn(clientId: string): Promise<void> {
    if (!this.tokenClient) {
      if (clientId.includes('YOUR_GOOGLE')) {
        throw new Error(
          'Google Calendar not configured. Please set a valid Client ID in environment.ts'
        );
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
        this.ngZone.run(() => { this.logger.info('[GoogleCalendar] Token revoked'); });
      });
    }

    gapi.client.setToken(null);
    await this.clearStoredToken();
    this.isSignedInSubject.next(false);
  }
}
