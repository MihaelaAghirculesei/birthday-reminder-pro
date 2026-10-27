/**
 * Makes the app boot with provideNoopAnimations() (see app.config.ts) by
 * reporting `prefers-reduced-motion: reduce` to matchMedia.
 *
 * Visual specs need this since timers are real: Material schedules dialog
 * open/close classes with rAF + setTimeout, and headless Electron throttles
 * rAF enough to leave dialogs stuck mid-animation in screenshots.
 *
 * Register per test so it also covers cy.reload():
 *   beforeEach(() => cy.on('window:before:load', emulateReducedMotion));
 */
export function emulateReducedMotion(win: Cypress.AUTWindow): void {
  const original = win.matchMedia.bind(win);
  win.matchMedia = (query: string): MediaQueryList => {
    const mql = original(query);
    if (query.includes('prefers-reduced-motion')) {
      Object.defineProperty(mql, 'matches', { value: true });
    }
    return mql;
  };
}
