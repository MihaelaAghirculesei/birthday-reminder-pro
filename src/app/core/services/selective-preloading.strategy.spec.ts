import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { LoggerService, SILENT_LOGGER_PROVIDER } from './logger.service';
import { SelectivePreloadingStrategy } from './selective-preloading.strategy';

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
    it('returns EMPTY regardless of route data', async () => {
      setup('server');
      let emitted = false;
      strategy.preload(preloadRoute, () => of(true)).subscribe({
        next: () => (emitted = true),
        complete: () => { expect(emitted).toBe(false);; }
      });
    });
  });

  // ─── preload flag ────────────────────────────────────────────────────────────

  describe('preload flag', () => {
    beforeEach(() => setup());

    it('returns EMPTY when data.preload is absent', async () => {
      let emitted = false;
      strategy.preload(noPreloadRoute, () => of(true)).subscribe({
        next: () => (emitted = true),
        complete: () => { expect(emitted).toBe(false);; }
      });
    });

    it('returns EMPTY when data.preload is false', async () => {
      let emitted = false;
      strategy.preload({ path: 'x', data: { preload: false } }, () => of(true)).subscribe({
        next: () => (emitted = true),
        complete: () => { expect(emitted).toBe(false);; }
      });
    });
  });

  // ─── network gating ──────────────────────────────────────────────────────────

  describe('network gating', () => {
    it('preloads when navigator.connection is unavailable', async () => {
      vi.useFakeTimers();
      setup('browser', null);
      const results: unknown[] = [];
      strategy.preload(preloadRoute, () => of(true)).subscribe(v => results.push(v));
      await vi.advanceTimersByTimeAsync(100);
      expect(results).toContain(true);
    });

    it('preloads on 3g', async () => {
      vi.useFakeTimers();
      setup('browser', { effectiveType: '3g' });
      const results: unknown[] = [];
      strategy.preload(preloadRoute, () => of(true)).subscribe(v => results.push(v));
      await vi.advanceTimersByTimeAsync(100);
      expect(results).toContain(true);
    });

    it('returns EMPTY on slow-2g', async () => {
      setup('browser', { effectiveType: 'slow-2g' });
      let emitted = false;
      strategy.preload(preloadRoute, () => of(true)).subscribe({
        next: () => (emitted = true),
        complete: () => { expect(emitted).toBe(false);; }
      });
    });

    it('returns EMPTY on 2g', async () => {
      setup('browser', { effectiveType: '2g' });
      let emitted = false;
      strategy.preload(preloadRoute, () => of(true)).subscribe({
        next: () => (emitted = true),
        complete: () => { expect(emitted).toBe(false);; }
      });
    });

    it('returns EMPTY when saveData is true', async () => {
      setup('browser', { saveData: true });
      let emitted = false;
      strategy.preload(preloadRoute, () => of(true)).subscribe({
        next: () => (emitted = true),
        complete: () => { expect(emitted).toBe(false);; }
      });
    });
  });

  // ─── scheduling ──────────────────────────────────────────────────────────────

  describe('scheduling', () => {
    beforeEach(() => setup());

    it('uses requestIdleCallback when available', async () => {
      vi.useFakeTimers();
      // Install a synchronous requestIdleCallback before creating the strategy
      // so the strategy picks it up via 'requestIdleCallback' in window
      const idleSpy = vi.fn().mockImplementation((cb: IdleRequestCallback) => { cb({ didTimeout: false, timeRemaining: () => 50 }); return 1; });
      (window as unknown as Record<string, unknown>)['requestIdleCallback'] = idleSpy;

      const results: unknown[] = [];
      strategy.preload(preloadRoute, () => of(true)).subscribe(v => results.push(v));
      await vi.advanceTimersByTimeAsync(0);

      expect(idleSpy).toHaveBeenCalledWith(expect.any(Function), { timeout: 3000 });
      expect(results).toContain(true);

      delete (window as unknown as Record<string, unknown>)['requestIdleCallback'];
    });

    it('falls back to setTimeout(100) when requestIdleCallback is absent', async () => {
      vi.useFakeTimers();
      const results: unknown[] = [];
      strategy.preload(preloadRoute, () => of(true)).subscribe(v => results.push(v));

      // Nothing emitted yet
      expect(results).toEqual([]);
      await vi.advanceTimersByTimeAsync(100);
      expect(results).toContain(true);
    });
  });

  // ─── load execution ──────────────────────────────────────────────────────────

  describe('load execution', () => {
    beforeEach(() => setup());

    it('emits true and tracks the route path on success', async () => {
      vi.useFakeTimers();
      const results: unknown[] = [];
      strategy.preload(preloadRoute, () => of('chunk')).subscribe(v => results.push(v));
      await vi.advanceTimersByTimeAsync(100);

      expect(results).toEqual([true]);
      expect(strategy.getPreloadedRoutes()).toContain('settings');
    });

    it('tracks "unknown" as path when route.path is absent', async () => {
      vi.useFakeTimers();
      strategy.preload({ data: { preload: true } }, () => of(true)).subscribe();
      await vi.advanceTimersByTimeAsync(100);

      expect(strategy.getPreloadedRoutes()).toContain('unknown');
    });

    it('completes without error when load() throws', async () => {
      vi.useFakeTimers();
      let errored = false;
      let completed = false;
      strategy.preload(preloadRoute, () => throwError(() => new Error('chunk fail'))).subscribe({
        error: () => (errored = true),
        complete: () => (completed = true)
      });
      await vi.advanceTimersByTimeAsync(100);

      expect(errored).toBe(false);
      expect(completed).toBe(true);
    });

    it('logs a warning when load() throws', async () => {
      vi.useFakeTimers();
      const logger = TestBed.inject(LoggerService);
      const warnSpy = vi.spyOn(logger, 'warn');
      const err = new Error('chunk fail');

      strategy.preload(preloadRoute, () => throwError(() => err)).subscribe();
      await vi.advanceTimersByTimeAsync(100);

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"settings"'), err);
    });
  });

  // ─── getPreloadedRoutes ───────────────────────────────────────────────────────

  describe('getPreloadedRoutes()', () => {
    it('returns a defensive copy', async () => {
      vi.useFakeTimers();
      setup();
      strategy.preload(preloadRoute, () => of(true)).subscribe();
      await vi.advanceTimersByTimeAsync(100);

      const copy = strategy.getPreloadedRoutes();
      copy.push('injected');
      expect(strategy.getPreloadedRoutes()).not.toContain('injected');
    });
  });
});
