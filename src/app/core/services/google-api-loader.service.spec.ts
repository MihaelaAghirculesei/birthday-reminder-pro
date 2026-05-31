import { TestBed } from '@angular/core/testing';

import type { Gapi } from './google-api.types';
import { GoogleApiLoaderService } from './google-api-loader.service';

describe('GoogleApiLoaderService', () => {
  let service: GoogleApiLoaderService;
  let appendChildSpy: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GoogleApiLoaderService);
    appendChildSpy = spyOn(document.head, 'appendChild').and.callFake(<T extends Node>(node: T) => node);
  });

  afterEach(() => {
    delete (window as Window & { gapi?: Gapi }).gapi;
    delete (window as unknown as { google?: unknown }).google;
  });

  // ── loadGapiScript ──────────────────────────────────────────────────────────

  describe('loadGapiScript()', () => {
    it('resolves immediately when isGapiLoaded is true', async () => {
      service.isGapiLoaded = true;
      await expectAsync(service.loadGapiScript()).toBeResolved();
      expect(appendChildSpy).not.toHaveBeenCalled();
    });

    it('resolves immediately when gapi is already on the global scope', async () => {
      (window as Window & { gapi?: Gapi }).gapi = {} as Gapi;
      await expectAsync(service.loadGapiScript()).toBeResolved();
      expect(service.isGapiLoaded).toBeTrue();
      expect(appendChildSpy).not.toHaveBeenCalled();
    });

    it('appends a script tag and resolves when gapi becomes available', async () => {
      let capturedScript!: HTMLScriptElement;
      appendChildSpy.and.callFake((script: HTMLScriptElement) => {
        capturedScript = script;
        return script;
      });

      const promise = service.loadGapiScript();
      (window as Window & { gapi?: Gapi }).gapi = {} as Gapi;
      capturedScript.onload!(new Event('load'));

      await expectAsync(promise).toBeResolved();
      expect(service.isGapiLoaded).toBeTrue();
      expect(capturedScript.src).toContain('apis.google.com/js/api.js');
      expect(capturedScript.async).toBeTrue();
      expect(capturedScript.defer).toBeTrue();
    });

    it('rejects when the script fails to load', async () => {
      let capturedScript!: HTMLScriptElement;
      appendChildSpy.and.callFake((script: HTMLScriptElement) => {
        capturedScript = script;
        return script;
      });

      const promise = service.loadGapiScript();
      capturedScript.onerror!(new Event('error'));

      await expectAsync(promise).toBeRejectedWithError('Failed to load Google API script');
    });
  });

  // ── loadGisScript ───────────────────────────────────────────────────────────

  describe('loadGisScript()', () => {
    it('resolves immediately when isGisLoaded is true', async () => {
      service.isGisLoaded = true;
      await expectAsync(service.loadGisScript()).toBeResolved();
      expect(appendChildSpy).not.toHaveBeenCalled();
    });

    it('resolves immediately when google.accounts is already available', async () => {
      (window as unknown as { google: unknown }).google = { accounts: {} };
      await expectAsync(service.loadGisScript()).toBeResolved();
      expect(service.isGisLoaded).toBeTrue();
      expect(appendChildSpy).not.toHaveBeenCalled();
    });

    it('appends a script tag and resolves when google.accounts becomes available', async () => {
      let capturedScript!: HTMLScriptElement;
      appendChildSpy.and.callFake((script: HTMLScriptElement) => {
        capturedScript = script;
        return script;
      });

      const promise = service.loadGisScript();
      (window as unknown as { google: unknown }).google = { accounts: {} };
      capturedScript.onload!(new Event('load'));

      await expectAsync(promise).toBeResolved();
      expect(service.isGisLoaded).toBeTrue();
      expect(capturedScript.src).toContain('accounts.google.com/gsi/client');
    });

    it('rejects when the script fails to load', async () => {
      let capturedScript!: HTMLScriptElement;
      appendChildSpy.and.callFake((script: HTMLScriptElement) => {
        capturedScript = script;
        return script;
      });

      const promise = service.loadGisScript();
      capturedScript.onerror!(new Event('error'));

      await expectAsync(promise).toBeRejectedWithError('Failed to load Google Identity Services script');
    });
  });

  // ── initGapiClient ──────────────────────────────────────────────────────────

  describe('initGapiClient()', () => {
    const DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';

    it('resolves after gapi.load callback and client.init succeed', async () => {
      (window as Window & { gapi?: Gapi }).gapi = {
        load: (_lib: string, cb: () => void) => cb(),
        client: {
          init: jasmine.createSpy('init').and.resolveTo(undefined),
        },
      } as unknown as Gapi;

      await expectAsync(service.initGapiClient(DOC)).toBeResolved();
      expect((window.gapi!.client.init as jasmine.Spy)).toHaveBeenCalledWith({
        discoveryDocs: [DOC],
      });
    });

    it('rejects when client.init throws', async () => {
      const initError = new Error('init failed');
      (window as Window & { gapi?: Gapi }).gapi = {
        load: (_lib: string, cb: () => void) => cb(),
        client: { init: jasmine.createSpy('init').and.rejectWith(initError) },
      } as unknown as Gapi;

      await expectAsync(service.initGapiClient(DOC)).toBeRejectedWith(initError);
    });
  });
});
