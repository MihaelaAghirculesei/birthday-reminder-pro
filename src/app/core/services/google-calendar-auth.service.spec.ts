import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Mock, MockedObject } from 'vitest';

import { provideTranslateTesting } from '../../testing/translate-testing';
import type { Gapi, GapiTokenObject } from './google-api.types';
import { GoogleCalendarAuthService } from './google-calendar-auth.service';
import type { GoogleAccountsOAuth2, TokenResponse } from './google-identity.types';
import { SILENT_LOGGER_PROVIDER } from './logger.service';
import { SecureStorageService } from './secure-storage.service';

describe('GoogleCalendarAuthService', () => {
  let service: GoogleCalendarAuthService;
  let mockSecureStorage: MockedObject<SecureStorageService>;
  let storedData: Map<string, unknown>;
  let currentToken: GapiTokenObject | null;

  const TOKEN_FUTURE = Date.now() + 3600000;
  const TOKEN_EXPIRING = Date.now() + 60000; // < 300s threshold
  const TOKEN_EXPIRED = Date.now() - 1000;

  const makeTokenResponse = (overrides: Partial<TokenResponse> = {}): TokenResponse => ({
    access_token: 'tok_abc',
    expires_in: 3600,
    token_type: 'Bearer',
    scope: 'https://www.googleapis.com/auth/calendar',
    ...overrides
  });

  const setupGapi = () => {
    currentToken = null;
    (window as unknown as {
      gapi: Gapi;
    }).gapi = {
      client: {
        setToken: vi.fn().mockImplementation((t: GapiTokenObject | null) => { currentToken = t; }),
        getToken: vi.fn().mockImplementation(() => currentToken),
        init: vi.fn().mockReturnValue(Promise.resolve()),
        load: vi.fn().mockReturnValue(Promise.resolve()),
        calendar: {} as Gapi['client']['calendar']
      },
      load: vi.fn()
    } as unknown as Gapi;
  };

  const setupGis = (opts: {
    revokeCallback?: boolean;
  } = {}) => {
    const mockTokenClient = {
      requestAccessToken: vi.fn().mockName('TokenClient.requestAccessToken')
    };
    const mockOauth2: Partial<GoogleAccountsOAuth2> = {
      initTokenClient: vi.fn().mockReturnValue(mockTokenClient),
      revoke: vi.fn().mockImplementation((_t: string, cb?: () => void) => {
        if (opts.revokeCallback !== false && cb)
          cb();
      })
    };
    (window as unknown as {
      google: unknown;
    }).google = { accounts: { oauth2: mockOauth2 } };
    return mockTokenClient;
  };

  beforeEach(() => {
    storedData = new Map();
    currentToken = null;

    mockSecureStorage = {
      setItem: vi.fn().mockName('SecureStorageService.setItem'),
      getItem: vi.fn().mockName('SecureStorageService.getItem'),
      removeItem: vi.fn().mockName('SecureStorageService.removeItem')
    } as unknown as MockedObject<SecureStorageService>;
    mockSecureStorage.setItem.mockImplementation(async (k, v) => { storedData.set(k, v); });
    mockSecureStorage.getItem.mockImplementation(async <T>(k: string) => (storedData.get(k) as T) ?? null);
    mockSecureStorage.removeItem.mockImplementation(async (k) => { storedData.delete(k); });

    setupGapi();
    setupGis();

    TestBed.configureTestingModule({
      providers: [
        GoogleCalendarAuthService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: SecureStorageService, useValue: mockSecureStorage },
        SILENT_LOGGER_PROVIDER,
        provideTranslateTesting()
      ]
    });

    service = TestBed.inject(GoogleCalendarAuthService);
  });

  afterEach(() => {
    delete (window as unknown as {
      gapi?: unknown;
    }).gapi;
    delete (window as unknown as {
      google?: unknown;
    }).google;
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  // ──────────────────────────────────────────────
  // initTokenClient
  // ──────────────────────────────────────────────
  describe('initTokenClient', () => {
    it('throws if GIS is not loaded', () => {
      delete (window as unknown as {
        google?: unknown;
      }).google;
      expect(() => service.initTokenClient('client_id', 'scope'))
        .toThrowError('Google Identity Services not loaded');
    });

    it('sets tokenClient after successful init', () => {
      service.initTokenClient('client_id', 'calendar.scope');
      expect(service.tokenClient).toBeTruthy();
    });

    it('wires the error_callback to reject pendingTokenPromise', async () => {
      vi.useFakeTimers();
      service.initTokenClient('client_id', 'scope');

      let rejected = false;
      service.pendingTokenPromise = {
        resolve: vi.fn(),
        reject: vi.fn().mockImplementation(() => { rejected = true; })
      };

      const config = vi.mocked((window.google!.accounts.oauth2.initTokenClient as Mock)).mock.lastCall![0];
      config.error_callback({ type: 'popup_closed', message: 'closed' });
      await vi.advanceTimersByTimeAsync(0);

      expect(rejected).toBe(true);
      expect(service.pendingTokenPromise).toBeNull();
    });
  });

  // ──────────────────────────────────────────────
  // handleTokenResponse
  // ──────────────────────────────────────────────
  describe('handleTokenResponse', () => {
    it('rejects pendingTokenPromise on error response', async () => {
      let rejectedMsg = '';
      service.pendingTokenPromise = {
        resolve: vi.fn(),
        reject: vi.fn().mockImplementation((e: Error) => { rejectedMsg = e.message; })
      };

      await service.handleTokenResponse(makeTokenResponse({ error: 'access_denied', error_description: 'User denied' }));

      expect(rejectedMsg).toBe('User denied');
      expect(service.pendingTokenPromise).toBeNull();
    });

    it('saves token, sets gapi token, and marks signed-in on success', async () => {
      await service.handleTokenResponse(makeTokenResponse());

      expect(mockSecureStorage.setItem).toHaveBeenCalled();
      expect((window as unknown as {
        gapi: Gapi;
      }).gapi.client.setToken)
        .toHaveBeenCalledWith({ access_token: 'tok_abc' });
      expect(service.isSignedIn).toBe(true);
    });

    it('resolves pendingTokenPromise on success', async () => {
      let resolved = false;
      service.pendingTokenPromise = {
        resolve: vi.fn().mockImplementation(() => { resolved = true; }),
        reject: vi.fn()
      };

      await service.handleTokenResponse(makeTokenResponse());

      expect(resolved).toBe(true);
      expect(service.pendingTokenPromise).toBeNull();
    });
  });

  // ──────────────────────────────────────────────
  // saveToken / getStoredToken / clearStoredToken
  // ──────────────────────────────────────────────
  describe('token storage', () => {
    it('saves and retrieves a token', async () => {
      await service.saveToken('tok_abc', TOKEN_FUTURE);
      const stored = await service.getStoredToken();
      expect(stored?.access_token).toBe('tok_abc');
      expect(stored?.expires_at).toBe(TOKEN_FUTURE);
    });

    it('returns null when no token stored', async () => {
      expect(await service.getStoredToken()).toBeNull();
    });

    it('clears stored token', async () => {
      await service.saveToken('tok_abc', TOKEN_FUTURE);
      await service.clearStoredToken();
      expect(await service.getStoredToken()).toBeNull();
    });

    it('is a noop on server (non-browser)', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          GoogleCalendarAuthService,
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: SecureStorageService, useValue: mockSecureStorage },
          SILENT_LOGGER_PROVIDER,
          provideTranslateTesting()
        ]
      });
      const serverService = TestBed.inject(GoogleCalendarAuthService);
      await serverService.saveToken('tok', TOKEN_FUTURE);
      expect(mockSecureStorage.setItem).not.toHaveBeenCalled();
      expect(await serverService.getStoredToken()).toBeNull();
    });
  });

  // ──────────────────────────────────────────────
  // restoreSession
  // ──────────────────────────────────────────────
  describe('restoreSession', () => {
    it('does nothing when no stored token', async () => {
      await service.restoreSession(true);
      expect(service.isSignedIn).toBe(false);
    });

    it('clears expired token and stays signed out', async () => {
      await service.saveToken('old_tok', TOKEN_EXPIRED);
      await service.restoreSession(true);
      expect(service.isSignedIn).toBe(false);
      expect(await service.getStoredToken()).toBeNull();
    });

    it('restores valid token and marks signed-in', async () => {
      await service.saveToken('valid_tok', TOKEN_FUTURE);
      await service.restoreSession(true);
      expect(service.isSignedIn).toBe(true);
    });

    it('does not set gapi token when gapi is not loaded', async () => {
      await service.saveToken('valid_tok', TOKEN_FUTURE);
      const gapi = (window as unknown as {
        gapi: Gapi;
      }).gapi;
      await service.restoreSession(false);
      expect(gapi.client.setToken).not.toHaveBeenCalled();
    });

    it('triggers silent refresh when token is near expiry', async () => {
      await service.saveToken('near_tok', TOKEN_EXPIRING);
      service.tokenClient = {
        requestAccessToken: vi.fn().mockName('TokenClient.requestAccessToken')
      };
      const pendingSpy = vi.spyOn(service, 'refreshTokenSilently').mockReturnValue(Promise.resolve());

      await service.restoreSession(true);

      expect(pendingSpy).toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────
  // refreshTokenSilently
  // ──────────────────────────────────────────────
  describe('refreshTokenSilently', () => {
    it('does nothing when tokenClient is null', async () => {
      service.tokenClient = null;
      await expect(service.refreshTokenSilently()).resolves.not.toThrow();
    });

    it('calls requestAccessToken with empty prompt', async () => {
      const mockClient = {
        requestAccessToken: vi.fn().mockName('TokenClient.requestAccessToken')
      };
      mockClient.requestAccessToken.mockImplementation(() => {
        service.pendingTokenPromise?.resolve('tok');
      });
      service.tokenClient = mockClient;

      await service.refreshTokenSilently();

      expect(mockClient.requestAccessToken).toHaveBeenCalledWith({ prompt: '' });
    });

    it('flips isSignedIn to false and clears the stored token when the refresh fails', async () => {
      await service.saveToken('dead-token', TOKEN_FUTURE);
      (service as unknown as {
        isSignedInSubject: {
          next: (v: boolean) => void;
        };
      })
        .isSignedInSubject.next(true);

      const mockClient = {
        requestAccessToken: vi.fn().mockName('TokenClient.requestAccessToken')
      };
      mockClient.requestAccessToken.mockImplementation(() => {
        service.pendingTokenPromise?.reject(new Error('interaction_required'));
      });
      service.tokenClient = mockClient;

      await service.refreshTokenSilently();

      expect(service.isSignedIn).toBe(false);
      expect(await service.getStoredToken()).toBeNull();
    });
  });

  // ──────────────────────────────────────────────
  // ensureValidToken
  // ──────────────────────────────────────────────
  describe('ensureValidToken', () => {
    it('does nothing when not signed in', async () => {
      const spy = vi.spyOn(service, 'refreshTokenSilently');
      await service.ensureValidToken();
      expect(spy).not.toHaveBeenCalled();
    });

    it('does nothing when no stored token', async () => {
      await service.handleTokenResponse(makeTokenResponse());
      storedData.clear();
      const spy = vi.spyOn(service, 'refreshTokenSilently');
      await service.ensureValidToken();
      expect(spy).not.toHaveBeenCalled();
    });

    it('refreshes when token is near expiry', async () => {
      await service.saveToken('tok', TOKEN_EXPIRING);
      await service.handleTokenResponse(makeTokenResponse());

      const spy = vi.spyOn(service, 'refreshTokenSilently').mockReturnValue(Promise.resolve());
      // Overwrite stored token with near-expiry one so ensureValidToken sees it
      await service.saveToken('tok', TOKEN_EXPIRING);
      await service.ensureValidToken();

      expect(spy).toHaveBeenCalled();
    });

    it('skips refresh when token has ample time left', async () => {
      await service.handleTokenResponse(makeTokenResponse());
      await service.saveToken('tok', TOKEN_FUTURE);
      const spy = vi.spyOn(service, 'refreshTokenSilently');
      await service.ensureValidToken();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────
  // signIn
  // ──────────────────────────────────────────────
  describe('signIn', () => {
    it('throws when tokenClient is null and placeholder clientId', async () => {
      service.tokenClient = null;
      await expect(service.signIn('YOUR_GOOGLE_CLIENT_ID')).rejects.toThrowError(/not configured/);
    });

    it('throws when tokenClient is null (non-placeholder)', async () => {
      service.tokenClient = null;
      await expect(service.signIn('real_client_id')).rejects.toThrowError(/not initialized/);
    });

    it('calls requestAccessToken with consent prompt and resolves on success', async () => {
      const mockClient = {
        requestAccessToken: vi.fn().mockName('TokenClient.requestAccessToken')
      };
      mockClient.requestAccessToken.mockImplementation(() => {
        service.pendingTokenPromise?.resolve('tok');
      });
      service.tokenClient = mockClient;

      await expect(service.signIn('real_client_id')).resolves.not.toThrow();
      expect(mockClient.requestAccessToken).toHaveBeenCalledWith({ prompt: 'consent' });
    });
  });

  // ──────────────────────────────────────────────
  // signOut
  // ──────────────────────────────────────────────
  describe('signOut', () => {
    it('revokes token, clears storage, and marks signed-out', async () => {
      await service.handleTokenResponse(makeTokenResponse());
      expect(service.isSignedIn).toBe(true);

      await service.signOut();

      expect(service.isSignedIn).toBe(false);
      expect(mockSecureStorage.removeItem).toHaveBeenCalled();
    });

    it('calls gapi.client.setToken(null)', async () => {
      await service.handleTokenResponse(makeTokenResponse());
      await service.signOut();
      expect((window as unknown as {
        gapi: Gapi;
      }).gapi.client.setToken)
        .toHaveBeenCalledWith(null);
    });

    it('revokes via GIS oauth2.revoke when a token exists', async () => {
      await service.handleTokenResponse(makeTokenResponse());
      await service.signOut();
      expect(window.google!.accounts.oauth2.revoke).toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────
  // isSignedIn$ observable
  // ──────────────────────────────────────────────
  describe('isSignedIn$', () => {
    it('emits false initially', async () => {
      service.isSignedIn$.subscribe(v => {
        expect(v).toBe(false);
      });
    });

    it('emits true after successful token response', async () => {
      const states: boolean[] = [];
      service.isSignedIn$.subscribe(v => states.push(v));

      await service.handleTokenResponse(makeTokenResponse());

      expect(states).toEqual([false, true]);
    });

    it('emits false after sign-out', async () => {
      await service.handleTokenResponse(makeTokenResponse());
      const states: boolean[] = [];
      service.isSignedIn$.subscribe(v => states.push(v));

      await service.signOut();

      expect(states).toEqual([true, false]);
    });
  });
});
