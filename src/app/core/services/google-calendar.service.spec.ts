import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { PLATFORM_ID, NgZone } from '@angular/core';
import { GoogleCalendarService } from './google-calendar.service';
import { GoogleApiLoaderService } from './google-api-loader.service';
import { GoogleCalendarAuthService } from './google-calendar-auth.service';
import { SecureStorageService } from './secure-storage.service';
import { SILENT_LOGGER_PROVIDER } from './logger.service';
import type { TokenResponse, TokenClient, GoogleAccountsOAuth2 } from './google-identity.types';
import type { Gapi, GapiTokenObject } from './google-api.types';
import { provideTranslateTesting } from '../../testing/translate-testing';

describe('GoogleCalendarService', () => {
  let service: GoogleCalendarService;
  let auth: GoogleCalendarAuthService;
  let loader: GoogleApiLoaderService;
  let mockTokenClient: jasmine.SpyObj<TokenClient>;
  let mockOauth2: jasmine.SpyObj<GoogleAccountsOAuth2>;
  let mockSecureStorage: jasmine.SpyObj<SecureStorageService>;
  let tokenCallback: ((response: TokenResponse) => void) | null = null;
  let currentToken: GapiTokenObject | null = null;
  let storedData = new Map<string, unknown>();

  const createMockGapi = (): Gapi => ({
    client: {
      calendar: {
        calendarList: {
          list: jasmine.createSpy('list').and.returnValue(Promise.resolve({ result: { items: [] } }))
        },
        events: {
          insert: jasmine.createSpy('insert').and.returnValue(Promise.resolve({ result: { id: 'event123' } })),
          update: jasmine.createSpy('update').and.returnValue(Promise.resolve({ result: {} })),
          delete: jasmine.createSpy('delete').and.returnValue(Promise.resolve({ result: {} }))
        }
      },
      init: jasmine.createSpy('init').and.returnValue(Promise.resolve()),
      load: jasmine.createSpy('load').and.returnValue(Promise.resolve()),
      setToken: jasmine.createSpy('setToken').and.callFake((token: GapiTokenObject | null) => {
        currentToken = token;
      }),
      getToken: jasmine.createSpy('getToken').and.callFake(() => currentToken)
    },
    load: jasmine.createSpy('load').and.callFake((_libs: string, callback: () => void) => {
      callback();
    })
  });

  const createMockGis = () => {
    mockTokenClient = jasmine.createSpyObj<TokenClient>('TokenClient', ['requestAccessToken']);

    mockOauth2 = {
      initTokenClient: jasmine.createSpy('initTokenClient').and.callFake((config) => {
        tokenCallback = config.callback;
        return mockTokenClient;
      }),
      revoke: jasmine.createSpy('revoke').and.callFake((_token: string, callback?: () => void) => {
        if (callback) callback();
      }),
      hasGrantedAllScopes: jasmine.createSpy('hasGrantedAllScopes').and.returnValue(true),
      hasGrantedAnyScope: jasmine.createSpy('hasGrantedAnyScope').and.returnValue(true)
    };

    return {
      accounts: {
        id: {
          initialize: jasmine.createSpy('initialize'),
          prompt: jasmine.createSpy('prompt'),
          renderButton: jasmine.createSpy('renderButton'),
          disableAutoSelect: jasmine.createSpy('disableAutoSelect')
        },
        oauth2: mockOauth2
      }
    };
  };

  beforeEach(() => {
    currentToken = null;
    tokenCallback = null;
    storedData = new Map();

    localStorage.clear();
    spyOn(localStorage, 'setItem').and.callThrough();
    spyOn(localStorage, 'getItem').and.callThrough();

    mockSecureStorage = jasmine.createSpyObj<SecureStorageService>('SecureStorageService', [
      'setItem',
      'getItem',
      'removeItem'
    ]);

    mockSecureStorage.setItem.and.callFake(async (key: string, value: unknown) => {
      storedData.set(key, value);
    });

    mockSecureStorage.getItem.and.callFake(async <T>(key: string): Promise<T | null> => {
      return (storedData.get(key) as T) ?? null;
    });

    mockSecureStorage.removeItem.and.callFake(async (key: string) => {
      storedData.delete(key);
    });

    window.gapi = createMockGapi();
    window.google = createMockGis();

    TestBed.configureTestingModule({
      providers: [
        GoogleCalendarService,
        GoogleApiLoaderService,
        GoogleCalendarAuthService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: SecureStorageService, useValue: mockSecureStorage },
        SILENT_LOGGER_PROVIDER,
        provideTranslateTesting()
      ]
    });

    service = TestBed.inject(GoogleCalendarService);
    auth = TestBed.inject(GoogleCalendarAuthService);
    loader = TestBed.inject(GoogleApiLoaderService);
  });

  afterEach(() => {
    delete window.gapi;
    delete window.google;
    localStorage.clear();
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should have default settings', () => {
    const settings = service.getCurrentSettings();
    expect(settings.enabled).toBe(false);
    expect(settings.calendarId).toBe('primary');
  });

  it('should update settings and save to localStorage', () => {
    const newSettings = { enabled: true, calendarId: 'custom', syncMode: 'two-way' as const, reminderMinutes: 60 };
    service.updateSettings(newSettings);
    expect(localStorage.setItem).toHaveBeenCalledWith('googleCalendarSettings', JSON.stringify(newSettings));
  });

  it('should check if calendar is enabled', () => {
    expect(service.isEnabled()).toBe(false);
    service.updateSettings({ ...service.getCurrentSettings(), enabled: true });
    expect(service.isEnabled()).toBe(false);
  });

  describe('Token Management with GIS', () => {
    beforeEach(async () => {
      loader.isGapiLoaded = true;
      loader.isGisLoaded = true;
      auth.initTokenClient('test-client-id', 'test-scopes');
    });

    it('should handle successful token response', fakeAsync(() => {
      const ngZone = TestBed.inject(NgZone);

      ngZone.run(() => {
        if (tokenCallback) {
          tokenCallback({
            access_token: 'test-token',
            expires_in: 3600,
            scope: 'https://www.googleapis.com/auth/calendar',
            token_type: 'Bearer'
          });
        }
      });
      tick();

      expect(window.gapi?.client.setToken).toHaveBeenCalledWith({ access_token: 'test-token' });
      expect(mockSecureStorage.setItem).toHaveBeenCalled();
    }));

    it('should handle token error response', fakeAsync(() => {
      const ngZone = TestBed.inject(NgZone);
      let rejectedError: unknown = null;

      const pendingPromise = new Promise<string>((resolve, reject) => {
        auth.pendingTokenPromise = { resolve, reject };
      });

      pendingPromise.catch((error) => {
        rejectedError = error;
      });

      ngZone.run(() => {
        if (tokenCallback) {
          tokenCallback({
            access_token: '',
            expires_in: 0,
            scope: '',
            token_type: '',
            error: 'access_denied',
            error_description: 'User denied access'
          });
        }
      });
      tick();

      expect(rejectedError).not.toBeNull();
      expect((rejectedError as Error).message).toBe('User denied access');
    }));

    it('should revoke token on sign out', async () => {
      currentToken = { access_token: 'test-token' };
      (auth as unknown as { isSignedInSubject: { next: (v: boolean) => void } }).isSignedInSubject.next(true);

      await service.signOut();

      expect(mockOauth2.revoke).toHaveBeenCalledWith('test-token', jasmine.any(Function));
      expect(window.gapi?.client.setToken).toHaveBeenCalledWith(null);
      expect(mockSecureStorage.removeItem).toHaveBeenCalledWith('googleCalendarToken');
    });

    it('should request access token on sign in', fakeAsync(() => {
      mockTokenClient.requestAccessToken.and.callFake(() => {
        if (tokenCallback) {
          tokenCallback({
            access_token: 'new-token',
            expires_in: 3600,
            scope: 'https://www.googleapis.com/auth/calendar',
            token_type: 'Bearer'
          });
        }
      });

      const signInPromise = service.signIn();
      tick();

      signInPromise.then(() => {
        expect(mockTokenClient.requestAccessToken).toHaveBeenCalledWith({ prompt: 'consent' });
      });
      tick();
    }));
  });

  describe('Token Refresh', () => {
    beforeEach(() => {
      loader.isGapiLoaded = true;
      loader.isGisLoaded = true;
      auth.initTokenClient('test-client-id', 'test-scopes');
      (auth as unknown as { isSignedInSubject: { next: (v: boolean) => void } }).isSignedInSubject.next(true);
    });

    it('should refresh token when expiring soon', fakeAsync(() => {
      const expiresAt = Date.now() + 200000;
      storedData.set('googleCalendarToken', { access_token: 'old-token', expires_at: expiresAt });

      mockTokenClient.requestAccessToken.and.callFake(() => {
        if (tokenCallback) {
          tokenCallback({
            access_token: 'refreshed-token',
            expires_in: 3600,
            scope: 'https://www.googleapis.com/auth/calendar',
            token_type: 'Bearer'
          });
        }
      });

      auth.ensureValidToken();
      tick();

      expect(mockTokenClient.requestAccessToken).toHaveBeenCalledWith({ prompt: '' });
    }));

    it('should not refresh token when valid', fakeAsync(() => {
      const expiresAt = Date.now() + 600000;
      storedData.set('googleCalendarToken', { access_token: 'valid-token', expires_at: expiresAt });

      auth.ensureValidToken();
      tick();

      expect(mockTokenClient.requestAccessToken).not.toHaveBeenCalled();
    }));

    it('should retry on 401 error', fakeAsync(() => {
      const expiresAt = Date.now() + 600000;
      storedData.set('googleCalendarToken', { access_token: 'test-token', expires_at: expiresAt });

      const error401 = { result: { error: { code: 401 } } };
      let callCount = 0;

      const operation = jasmine.createSpy('operation').and.callFake(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(error401);
        }
        return Promise.resolve({ result: { items: [] } });
      });

      mockTokenClient.requestAccessToken.and.callFake(() => {
        if (tokenCallback) {
          tokenCallback({
            access_token: 'refreshed-token',
            expires_in: 3600,
            scope: 'https://www.googleapis.com/auth/calendar',
            token_type: 'Bearer'
          });
        }
      });

      (service as unknown as { executeWithRetry: <T>(op: () => Promise<T>, ctx: string) => Promise<T> })
        .executeWithRetry(operation, 'test');
      tick();

      expect(operation).toHaveBeenCalledTimes(2);
    }));
  });

  describe('Calendar Operations', () => {
    beforeEach(() => {
      loader.isGapiLoaded = true;
      loader.isGisLoaded = true;
      auth.initTokenClient('test-client-id', 'test-scopes');
      (auth as unknown as { isSignedInSubject: { next: (v: boolean) => void } }).isSignedInSubject.next(true);
      service.updateSettings({ enabled: true, calendarId: 'primary', syncMode: 'one-way', reminderMinutes: 1440 });

      const expiresAt = Date.now() + 600000;
      storedData.set('googleCalendarToken', { access_token: 'valid-token', expires_at: expiresAt });

      if (window.gapi) {
        window.gapi.client.calendar.calendarList.list = jasmine.createSpy('list').and.returnValue(
          Promise.resolve({
            result: {
              items: [
                { id: 'primary', summary: 'Primary Calendar' },
                { id: 'custom', summary: 'Custom Calendar' }
              ]
            }
          })
        );
      }
    });

    it('should get calendars list', async () => {
      const calendars = await service.getCalendars();
      expect(calendars.length).toBe(2);
      expect(calendars[0].id).toBe('primary');
      expect(calendars[1].summary).toBe('Custom Calendar');
    });

    it('should throw error when getting calendars while not signed in', async () => {
      (auth as unknown as { isSignedInSubject: { next: (v: boolean) => void } }).isSignedInSubject.next(false);
      try {
        await service.getCalendars();
        fail('Should have thrown error');
      } catch (error: unknown) {
        expect((error as Error).message).toContain('Not signed in');
      }
    });

    it('should sync birthday to calendar', async () => {
      const birthday = {
        id: '1',
        name: 'John Doe',
        birthDate: '1990-06-15',
        categoryId: 'cat1',
        reminderDays: 7
      };

      const eventId = await service.syncBirthdayToCalendar(birthday);

      expect(eventId).toBe('event123');
      expect(window.gapi?.client.calendar.events.insert).toHaveBeenCalled();
    });

    it('should throw error when syncing birthday while not enabled', async () => {
      service.updateSettings({ enabled: false, calendarId: 'primary', syncMode: 'one-way', reminderMinutes: 1440 });
      const birthday = {
        id: '1',
        name: 'John Doe',
        birthDate: '1990-06-15',
        categoryId: 'cat1',
        reminderDays: 7
      };

      try {
        await service.syncBirthdayToCalendar(birthday);
        fail('Should have thrown error');
      } catch (error: unknown) {
        expect((error as Error).message).toContain('not enabled');
      }
    });

    it('should update birthday in calendar', async () => {
      const birthday = {
        id: '1',
        name: 'Jane Smith',
        birthDate: '1985-12-25',
        categoryId: 'cat1',
        reminderDays: 3
      };

      await service.updateBirthdayInCalendar(birthday, 'event456');

      expect(window.gapi?.client.calendar.events.update).toHaveBeenCalledWith({
        calendarId: 'primary',
        eventId: 'event456',
        resource: jasmine.any(Object)
      });
    });

    it('should delete birthday from calendar', async () => {
      await service.deleteBirthdayFromCalendar('event789');

      expect(window.gapi?.client.calendar.events.delete).toHaveBeenCalledWith({
        calendarId: 'primary',
        eventId: 'event789'
      });
    });

    it('should not delete birthday when not enabled', async () => {
      service.updateSettings({ enabled: false, calendarId: 'primary', syncMode: 'one-way', reminderMinutes: 1440 });
      await service.deleteBirthdayFromCalendar('event789');
      expect(window.gapi?.client.calendar.events.delete).not.toHaveBeenCalled();
    });

    it('should sync all birthdays and report results', async () => {
      const birthdays = [
        { id: '1', name: 'John', birthDate: '1990-06-15', categoryId: 'cat1', reminderDays: 7 },
        { id: '2', name: 'Jane', birthDate: '1985-12-25', categoryId: 'cat1', reminderDays: 3 }
      ];

      const results = await service.syncAllBirthdays(birthdays);

      expect(results.success).toBe(2);
      expect(results.failed).toBe(0);
      expect(results.errors.length).toBe(0);
    });

    it('should handle errors during batch sync', async () => {
      if (window.gapi) {
        window.gapi.client.calendar.events.insert = jasmine.createSpy('insert').and.callFake(() => {
          return Promise.reject(new Error('API error'));
        });
      }

      const birthdays = [
        { id: '1', name: 'John', birthDate: '1990-06-15', categoryId: 'cat1', reminderDays: 7 },
        { id: '2', name: 'Jane', birthDate: '1985-12-25', categoryId: 'cat1', reminderDays: 3 }
      ];

      const results = await service.syncAllBirthdays(birthdays);

      expect(results.success).toBe(0);
      expect(results.failed).toBe(2);
      expect(results.errors.length).toBe(2);
      expect(results.errors[0]).toContain('John');
    });
  });

  describe('Session Restore', () => {
    it('should restore session from valid stored token', fakeAsync(() => {
      const expiresAt = Date.now() + 600000;
      storedData.set('googleCalendarToken', { access_token: 'stored-token', expires_at: expiresAt });

      loader.isGapiLoaded = true;
      loader.isGisLoaded = true;
      auth.initTokenClient('test-client-id', 'test-scopes');
      auth.restoreSession(loader.isGapiLoaded);
      tick();

      expect(window.gapi?.client.setToken).toHaveBeenCalledWith({ access_token: 'stored-token' });
    }));

    it('should clear expired token on restore', fakeAsync(() => {
      const expiresAt = Date.now() - 1000;
      storedData.set('googleCalendarToken', { access_token: 'expired-token', expires_at: expiresAt });

      loader.isGapiLoaded = true;
      loader.isGisLoaded = true;
      auth.initTokenClient('test-client-id', 'test-scopes');
      auth.restoreSession(loader.isGapiLoaded);
      tick();

      expect(mockSecureStorage.removeItem).toHaveBeenCalledWith('googleCalendarToken');
    }));
  });

  describe('isInitialized', () => {
    it('should return false when not initialized', () => {
      expect(service.isInitialized()).toBe(false);
    });

    it('should return true when fully initialized', () => {
      loader.isGapiLoaded = true;
      loader.isGisLoaded = true;
      auth.initTokenClient('test-client-id', 'test-scopes');

      expect(service.isInitialized()).toBe(true);
    });
  });
});
