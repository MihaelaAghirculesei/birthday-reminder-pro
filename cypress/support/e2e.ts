import './commands';
import 'cypress-axe';

/**
 * Global IntersectionObserver stub — fires for every page load in every test.
 *
 * WHY HERE (not in mockDeferViewport):
 * Angular's @defer(on viewport) relies on IntersectionObserver to swap the
 * placeholder for the real component. In Cypress headless mode (no GPU
 * compositor) the real IO never fires, so deferred blocks stay as placeholders
 * and tests fail with "Expected to find element: app-birthday-chart".
 *
 * The previous fix used cy.on('window:before:load', …) inside the
 * mockDeferViewport command. In Cypress 15, cy.on() is scoped to the test
 * chain and does NOT reliably re-fire for cy.reload() called from inside a
 * nested custom command (e.g. seedVisualTestData). As a result, after the
 * data-seed reload the IO was never replaced and the chart never rendered.
 *
 * Cypress.on('window:before:load', …) is a GLOBAL runner listener — it fires
 * for cy.visit(), cy.reload(), and any other navigation in any test. This
 * guarantees the stub is always in place before Angular reads IntersectionObserver.
 *
 * The stub fires isIntersecting:true asynchronously (setTimeout 0 + 200 ms
 * fallback) so Angular's @defer state machine has time to finish its own setup
 * before the viewport callback is delivered. A synchronous callback causes the
 * defer state machine to miss the event entirely.
 */
Cypress.on('window:before:load', (win) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (win as any).IntersectionObserver = class ImmediateIntersectionObserver {
    readonly root: Element | Document | null = null;
    readonly rootMargin = '0px';
    readonly thresholds: ReadonlyArray<number> = [0];

    private readonly _cb: IntersectionObserverCallback;

    constructor(callback: IntersectionObserverCallback) {
      this._cb = callback;
    }

    observe(target: Element): void {
      let fired = false;
      const fire = () => {
        if (fired) return;
        fired = true;
        const rect =
          typeof (target as HTMLElement).getBoundingClientRect === 'function'
            ? (target as HTMLElement).getBoundingClientRect()
            : { top: 0, left: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}) } as unknown as DOMRect;
        const entry = {
          isIntersecting: true,
          target,
          intersectionRatio: 1,
          boundingClientRect: rect,
          intersectionRect: rect,
          rootBounds: null,
          time: 0,
        } as unknown as IntersectionObserverEntry;
        try {
          this._cb([entry], this as unknown as IntersectionObserver);
        } catch (_err) {
          // Swallow errors so Angular bootstrap is never interrupted by the stub
        }
      };
      // Primary: fire after the current call stack drains so Angular's @defer
      // state machine has finished its own observe() setup.
      setTimeout(fire, 0);
      // Fallback: in case the 0 ms task was de-prioritised by a zone microtask
      // race or an unusually slow Angular init cycle.
      setTimeout(fire, 200);
    }

    unobserve(_target: Element): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  };
});
