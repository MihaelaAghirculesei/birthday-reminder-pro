import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { of, throwError } from 'rxjs';
import { SelectivePreloadingStrategy } from './selective-preloading.strategy';
import { LoggerService, SILENT_LOGGER_PROVIDER } from './logger.service';

describe('SelectivePreloadingStrategy', () => {
  let strategy: SelectivePreloadingStrategy;

  const preloadRoute = { path: 'settings', data: { preload: true } };
  const noPreloadRoute = { path: 'about', data: {} };

  function setup(platformId = 'browser', connection?: object | null): void {
    TestBed.configureTestingModule({
      providers: [
        SelectivePreloadingStrategy,
        SILENT_LOGGER_PROVIDER,
        { provide: PLATFORM_ID, useValue: platformId }
      ]
    });
    strategy = TestBed.inject(SelectivePreloadingStrategy);
    setConnection(connection ?? null);
    // Ensure requestIdleCallback is absent by default so tests use the setTimeout path
    delete (window as unknown as Record<string, unknown>)['requestIdleCallback'];
  }

  function setConnection(value: object | null): void {
    Object.defineProperty(navigator, 'connection', {
      value,
      configurable: true,
      writable: true
    });
  }

  afterEach(() => setConnection(null));

  // ─── SSR ────────────────────────────────────────────────────────────────────

  describe('SSR (non-browser platform)', () => {
    it('returns EMPTY regardless of route data', (done) => {
      setup('server');
      let emitted = false;
      strategy.preload(preloadRoute, () => of(true)).subscribe({
        next: () => (emitted = true),
        complete: () => { expect(emitted).toBeFalse(); done(); }
      });
    });
  });

  // ─── preload flag ────────────────────────────────────────────────────────────

  describe('preload flag', () => {
    beforeEach(() => setup());

    it('returns EMPTY when data.preload is absent', (done) => {
      let emitted = false;
      strategy.preload(noPreloadRoute, () => of(true)).subscribe({
        next: () => (emitted = true),
        complete: () => { expect(emitted).toBeFalse(); done(); }
      });
    });

    it('returns EMPTY when data.preload is false', (done) => {
      let emitted = false;
      strategy.preload({ path: 'x', data: { preload: false } }, () => of(true)).subscribe({
        next: () => (emitted = true),
        complete: () => { expect(emitted).toBeFalse(); done(); }
      });
    });
  });

  // ─── network gating ──────────────────────────────────────────────────────────

  describe('network gating', () => {
    it('preloads when navigator.connection is unavailable', fakeAsync(() => {
      setup('browser', null);
      const results: unknown[] = [];
      strategy.preload(preloadRoute, () => of(true)).subscribe(v => results.push(v));
      tick(100);
      expect(results).toContain(true);
    }));

    it('preloads on 3g', fakeAsync(() => {
      setup('browser', { effectiveType: '3g' });
      const results: unknown[] = [];
      strategy.preload(preloadRoute, () => of(true)).subscribe(v => results.push(v));
      tick(100);
      expect(results).toContain(true);
    }));

    it('returns EMPTY on slow-2g', (done) => {
      setup('browser', { effectiveType: 'slow-2g' });
      let emitted = false;
      strategy.preload(preloadRoute, () => of(true)).subscribe({
        next: () => (emitted = true),
        complete: () => { expect(emitted).toBeFalse(); done(); }
      });
    });

    it('returns EMPTY on 2g', (done) => {
      setup('browser', { effectiveType: '2g' });
      let emitted = false;
      strategy.preload(preloadRoute, () => of(true)).subscribe({
        next: () => (emitted = true),
        complete: () => { expect(emitted).toBeFalse(); done(); }
      });
    });

    it('returns EMPTY when saveData is true', (done) => {
      setup('browser', { saveData: true });
      let emitted = false;
      strategy.preload(preloadRoute, () => of(true)).subscribe({
        next: () => (emitted = true),
        complete: () => { expect(emitted).toBeFalse(); done(); }
      });
    });
  });

  // ─── scheduling ──────────────────────────────────────────────────────────────

  describe('scheduling', () => {
    beforeEach(() => setup());

    it('uses requestIdleCallback when available', fakeAsync(() => {
      // Install a synchronous requestIdleCallback before creating the strategy
      // so the strategy picks it up via 'requestIdleCallback' in window
      const idleSpy = jasmine.createSpy('requestIdleCallback').and.callFake(
        (cb: IdleRequestCallback) => { cb({ didTimeout: false, timeRemaining: () => 50 }); return 1; }
      );
      (window as unknown as Record<string, unknown>)['requestIdleCallback'] = idleSpy;

      const results: unknown[] = [];
      strategy.preload(preloadRoute, () => of(true)).subscribe(v => results.push(v));
      tick();

      expect(idleSpy).toHaveBeenCalledWith(jasmine.any(Function), { timeout: 3000 });
      expect(results).toContain(true);

      delete (window as unknown as Record<string, unknown>)['requestIdleCallback'];
    }));

    it('falls back to setTimeout(100) when requestIdleCallback is absent', fakeAsync(() => {
      const results: unknown[] = [];
      strategy.preload(preloadRoute, () => of(true)).subscribe(v => results.push(v));

      // Nothing emitted yet
      expect(results).toEqual([]);
      tick(100);
      expect(results).toContain(true);
    }));
  });

  // ─── load execution ──────────────────────────────────────────────────────────

  describe('load execution', () => {
    beforeEach(() => setup());

    it('emits true and tracks the route path on success', fakeAsync(() => {
      const results: unknown[] = [];
      strategy.preload(preloadRoute, () => of('chunk')).subscribe(v => results.push(v));
      tick(100);

      expect(results).toEqual([true]);
      expect(strategy.getPreloadedRoutes()).toContain('settings');
    }));

    it('tracks "unknown" as path when route.path is absent', fakeAsync(() => {
      strategy.preload({ data: { preload: true } }, () => of(true)).subscribe();
      tick(100);

      expect(strategy.getPreloadedRoutes()).toContain('unknown');
    }));

    it('completes without error when load() throws', fakeAsync(() => {
      let errored = false;
      let completed = false;
      strategy.preload(preloadRoute, () => throwError(() => new Error('chunk fail'))).subscribe({
        error: () => (errored = true),
        complete: () => (completed = true)
      });
      tick(100);

      expect(errored).toBeFalse();
      expect(completed).toBeTrue();
    }));

    it('logs a warning when load() throws', fakeAsync(() => {
      const logger = TestBed.inject(LoggerService);
      const warnSpy = spyOn(logger, 'warn');
      const err = new Error('chunk fail');

      strategy.preload(preloadRoute, () => throwError(() => err)).subscribe();
      tick(100);

      expect(warnSpy).toHaveBeenCalledWith(jasmine.stringContaining('"settings"'), err);
    }));
  });

  // ─── getPreloadedRoutes ───────────────────────────────────────────────────────

  describe('getPreloadedRoutes()', () => {
    it('returns a defensive copy', fakeAsync(() => {
      setup();
      strategy.preload(preloadRoute, () => of(true)).subscribe();
      tick(100);

      const copy = strategy.getPreloadedRoutes();
      copy.push('injected');
      expect(strategy.getPreloadedRoutes()).not.toContain('injected');
    }));
  });
});
