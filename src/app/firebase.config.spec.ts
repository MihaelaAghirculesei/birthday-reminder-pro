import type { FirebaseApp, FirebaseOptions } from 'firebase/app';

import { environment } from '../environments/environment';
import {
  activateAppCheck,
  checkFirebaseOptions,
  isFirebaseConfigured,
  resolveAppCheckConfig,
} from './firebase.config';

describe('checkFirebaseOptions', () => {
  it('returns false when opts is undefined', () => {
    expect(checkFirebaseOptions(undefined)).toBe(false);
  });

  it('returns false when opts is an empty object', () => {
    expect(checkFirebaseOptions({} as FirebaseOptions)).toBe(false);
  });

  it('returns false when apiKey is a placeholder', () => {
    expect(checkFirebaseOptions({ apiKey: 'YOUR_API_KEY', projectId: 'real-project' })).toBe(false);
  });

  it('returns false when projectId is a placeholder', () => {
    expect(checkFirebaseOptions({ apiKey: 'AIzaSyReal', projectId: 'YOUR_PROJECT_ID' })).toBe(false);
  });

  it('returns false when apiKey starts with YOUR_ and projectId also starts with YOUR_', () => {
    expect(checkFirebaseOptions({ apiKey: 'YOUR_API_KEY', projectId: 'YOUR_PROJECT_ID' })).toBe(false);
  });

  it('returns false when apiKey is missing but projectId is real', () => {
    expect(checkFirebaseOptions({ projectId: 'real-project' } as FirebaseOptions)).toBe(false);
  });

  it('returns false when projectId is missing but apiKey is real', () => {
    expect(checkFirebaseOptions({ apiKey: 'AIzaSyReal' } as FirebaseOptions)).toBe(false);
  });

  it('returns true when both apiKey and projectId are non-placeholder strings', () => {
    expect(checkFirebaseOptions({ apiKey: 'AIzaSyReal', projectId: 'real-project' })).toBe(true);
  });
});

describe('isFirebaseConfigured', () => {
  it('is consistent with checkFirebaseOptions(environment.firebase)', () => {
    // isFirebaseConfigured() is a thin wrapper — its output must always match
    // checkFirebaseOptions applied to the same config object.
    // We do NOT assume real credentials are present (CI uses placeholder env).
    expect(isFirebaseConfigured()).toBe(checkFirebaseOptions(environment.firebase));
  });
});

describe('resolveAppCheckConfig', () => {
  const base = { production: true, appCheckSiteKey: 'site-key', appCheckDebugToken: 'debug-token' };

  it('returns null when no site key is configured', () => {
    expect(resolveAppCheckConfig({ ...base, appCheckSiteKey: '' })).toBeNull();
  });

  it('drops the debug token in production builds', () => {
    expect(resolveAppCheckConfig(base)).toEqual({ siteKey: 'site-key', debugToken: undefined });
  });

  it('keeps the debug token in development builds', () => {
    expect(resolveAppCheckConfig({ ...base, production: false })).toEqual({
      siteKey: 'site-key',
      debugToken: 'debug-token',
    });
  });

  it('treats an empty debug token as absent', () => {
    expect(resolveAppCheckConfig({ ...base, production: false, appCheckDebugToken: '' })?.debugToken)
      .toBeUndefined();
  });
});

describe('activateAppCheck', () => {
  const app = { name: '[DEFAULT]' } as FirebaseApp;
  const globals = globalThis as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string };

  type AppCheckModule = Parameters<typeof activateAppCheck>[0];

  function createAppCheckModule() {
    return {
      ReCaptchaV3Provider: vi.fn(function (this: { siteKey: string }, siteKey: string) {
        this.siteKey = siteKey;
      }),
      initializeAppCheck: vi.fn().mockReturnValue({ app }),
    };
  }

  afterEach(() => {
    delete globals.FIREBASE_APPCHECK_DEBUG_TOKEN;
  });

  it('initializes App Check with a reCAPTCHA v3 provider and token auto-refresh', () => {
    const appCheckModule = createAppCheckModule();

    activateAppCheck(appCheckModule as unknown as AppCheckModule, app, { siteKey: 'site-key' });

    expect(appCheckModule.ReCaptchaV3Provider).toHaveBeenCalledWith('site-key');
    expect(appCheckModule.initializeAppCheck).toHaveBeenCalledWith(app, {
      provider: expect.objectContaining({ siteKey: 'site-key' }),
      isTokenAutoRefreshEnabled: true,
    });
    expect(globals.FIREBASE_APPCHECK_DEBUG_TOKEN).toBeUndefined();
  });

  it('exposes the debug token to the SDK before initializing', () => {
    const appCheckModule = createAppCheckModule();
    let tokenSeenByInit: string | undefined;
    appCheckModule.initializeAppCheck.mockImplementation(() => {
      tokenSeenByInit = globals.FIREBASE_APPCHECK_DEBUG_TOKEN;
      return { app };
    });

    activateAppCheck(appCheckModule as unknown as AppCheckModule, app, {
      siteKey: 'site-key',
      debugToken: 'debug-token',
    });

    expect(tokenSeenByInit).toBe('debug-token');
  });
});