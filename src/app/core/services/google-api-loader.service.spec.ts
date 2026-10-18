import { TestBed } from '@angular/core/testing';
import type { Mock } from 'vitest';

import type { Gapi } from './google-api.types';
import { GoogleApiLoaderService } from './google-api-loader.service';

describe('GoogleApiLoaderService', () => {
  let service: GoogleApiLoaderService;
  let appendChildSpy: Mock;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GoogleApiLoaderService);
    appendChildSpy = vi.spyOn(document.head, 'appendChild').mockImplementation(<T extends Node>(node: T) => node);
  });

  afterEach(() => {
    delete (window as Window & {
      gapi?: Gapi;
    }).gapi;
    delete (window as unknown as {
      google?: unknown;
    }).google;
  });

  // ── loadGapiScript ──────────────────────────────────────────────────────────

  describe('loadGapiScript()', () => {
    it('resolves immediately when isGapiLoaded is true', async () => {
      service.isGapiLoaded = true;
      await expect(service.loadGapiScript()).resolves.not.toThrow();
      expect(appendChildSpy).not.toHaveBeenCalled();
    });

    it('resolves immediately when gapi is already on the global scope', async () => {
      (window as Window & {
        gapi?: Gapi;
      }).gapi = {} as Gapi;
      await expect(service.loadGapiScript()).resolves.not.toThrow();
      expect(service.isGapiLoaded).toBe(true);
      expect(appendChildSpy).not.toHaveBeenCalled();
    });

    it('appends a script tag and resolves when gapi becomes available', async () => {
      let capturedScript!: HTMLScriptElement;
      appendChildSpy.mockImplementation((script: HTMLScriptElement) => {
        capturedScript = script;
        return script;
      });

      const promise = service.loadGapiScript();
      (window as Window & {
        gapi?: Gapi;
      }).gapi = {} as Gapi;
      capturedScript.onload!(new Event('load'));

      await expect(promise).resolves.not.toThrow();
      expect(service.isGapiLoaded).toBe(true);
      expect(capturedScript.src).toContain('apis.google.com/js/api.js');
      expect(capturedScript.async).toBe(true);
      expect(capturedScript.defer).toBe(true);
    });

    it('rejects when the script fails to load', async () => {
      let capturedScript!: HTMLScriptElement;
      appendChildSpy.mockImplementation((script: HTMLScriptElement) => {
        capturedScript = script;
        return script;
      });

      const promise = service.loadGapiScript();
      capturedScript.onerror!(new Event('error'));

      await expect(promise).rejects.toThrowError('Failed to load Google API script');
    });
  });

  // ── loadGisScript ───────────────────────────────────────────────────────────

  describe('loadGisScript()', () => {
    it('resolves immediately when isGisLoaded is true', async () => {
      service.isGisLoaded = true;
      await expect(service.loadGisScript()).resolves.not.toThrow();
      expect(appendChildSpy).not.toHaveBeenCalled();
    });

    it('resolves immediately when google.accounts is already available', async () => {
      (window as unknown as {
        google: unknown;
      }).google = { accounts: {} };
      await expect(service.loadGisScript()).resolves.not.toThrow();
      expect(service.isGisLoaded).toBe(true);
      expect(appendChildSpy).not.toHaveBeenCalled();
    });

    it('appends a script tag and resolves when google.accounts becomes available', async () => {
      let capturedScript!: HTMLScriptElement;
      appendChildSpy.mockImplementation((script: HTMLScriptElement) => {
        capturedScript = script;
        return script;
      });

      const promise = service.loadGisScript();
      (window as unknown as {
        google: unknown;
      }).google = { accounts: {} };
      capturedScript.onload!(new Event('load'));

      await expect(promise).resolves.not.toThrow();
      expect(service.isGisLoaded).toBe(true);
      expect(capturedScript.src).toContain('accounts.google.com/gsi/client');
    });

    it('rejects when the script fails to load', async () => {
      let capturedScript!: HTMLScriptElement;
      appendChildSpy.mockImplementation((script: HTMLScriptElement) => {
        capturedScript = script;
        return script;
      });

      const promise = service.loadGisScript();
      capturedScript.onerror!(new Event('error'));

      await expect(promise).rejects.toThrowError('Failed to load Google Identity Services script');
    });
  });

  // ── initGapiClient ──────────────────────────────────────────────────────────

  describe('initGapiClient()', () => {
    const DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';

    it('resolves after gapi.load callback and client.init succeed', async () => {
      (window as Window & {
        gapi?: Gapi;
      }).gapi = {
        load: (_lib: string, cb: () => void) => cb(),
        client: {
          init: vi.fn().mockResolvedValue(undefined),
        },
      } as unknown as Gapi;

      await expect(service.initGapiClient(DOC)).resolves.not.toThrow();
      expect((window.gapi!.client.init as Mock)).toHaveBeenCalledWith({
        discoveryDocs: [DOC],
      });
    });

    it('rejects when client.init throws', async () => {
      const initError = new Error('init failed');
      (window as Window & {
        gapi?: Gapi;
      }).gapi = {
        load: (_lib: string, cb: () => void) => cb(),
        client: { init: vi.fn().mockRejectedValue(initError) },
      } as unknown as Gapi;

      await expect(service.initGapiClient(DOC)).rejects.toEqual(initError);
    });
  });
});
