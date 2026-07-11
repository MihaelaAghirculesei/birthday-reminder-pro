/**
 * Performance — virtual scrolling with large birthday lists
 *
 * Strategy
 * ─────────
 * • cy.seedManyBirthdays() writes N fake birthdays directly into IndexedDB
 *   (same technique as cy.seedVisualTestData() in visual-regression.cy.ts),
 *   so the list is at full size before any rendering happens — no need to
 *   drive the add-birthday form N times.
 * • The DOM node count for app-birthday-item is asserted to stay far below
 *   the total birthday count: that's the actual proof CdkVirtualScrollViewport
 *   is windowing the list instead of rendering everything.
 * • Scroll performance is measured with performance.now(), matching the
 *   pattern used for other timing-sensitive assertions in this suite —
 *   scrolling the full list must complete within a generous time budget,
 *   which would fail if the viewport hung or a scroll listener triggered a
 *   full-list re-render.
 */

const TOTAL_BIRTHDAYS = 600;
// Virtual scroll viewport is 600px tall; even the compact 100px item size
// caps the rendered window well under this — a generous ceiling that still
// catches a regression to full-list rendering.
const MAX_RENDERED_ITEMS = 100;

describe('Performance — Virtual scroll with large birthday lists', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.clearIndexedDB();
    cy.visit('/');
    cy.waitForAngular();
    cy.seedManyBirthdays(TOTAL_BIRTHDAYS);
  });

  it(`renders only a small DOM window for ${TOTAL_BIRTHDAYS} birthdays`, () => {
    cy.get('[data-testid="birthday-list"]').should('be.visible');
    cy.get('app-birthday-item').its('length').should('be.greaterThan', 0);
    cy.get('app-birthday-item').its('length').should('be.lessThan', MAX_RENDERED_ITEMS);
  });

  it('scrolls through the full list within a bounded time budget and keeps the DOM window small', () => {
    cy.get('[data-testid="birthday-list"]').should('be.visible');

    cy.window()
      .then((win) => {
        const viewport = win.document.querySelector<HTMLElement>('[data-testid="birthday-list"]');
        expect(viewport, 'virtual scroll viewport').to.exist;

        return new Cypress.Promise<number>((resolve) => {
          const maxScroll = viewport!.scrollHeight - viewport!.clientHeight;
          const steps = 20;
          const start = win.performance.now();
          let step = 0;

          function scrollStep(): void {
            step++;
            viewport!.scrollTop = (maxScroll * step) / steps;
            if (step < steps) {
              win.requestAnimationFrame(scrollStep);
            } else {
              win.requestAnimationFrame(() => resolve(win.performance.now() - start));
            }
          }

          win.requestAnimationFrame(scrollStep);
        });
      })
      .then((elapsedMs) => {
        cy.log(`Scrolled through ${TOTAL_BIRTHDAYS} birthdays in ${elapsedMs.toFixed(0)}ms`);
        // Generous ceiling — this is a jank/hang guard, not a tight perf budget.
        // A regression to non-virtualized rendering of 600 real components
        // would blow well past this on any CI runner.
        expect(elapsedMs).to.be.lessThan(5000);
      });

    // After scrolling to the bottom, the DOM must still hold only a small window —
    // proves virtualization stays active throughout scrolling, not just on first render.
    cy.get('app-birthday-item').its('length').should('be.lessThan', MAX_RENDERED_ITEMS);
  });
});
