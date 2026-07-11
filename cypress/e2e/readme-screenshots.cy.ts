/**
 * README Screenshots — captures the 6 images referenced in README.md.
 *
 * Run with:  npm run e2e:readme-screenshots
 * (the app must be running on localhost:4203)
 *
 * The cypress.config.ts after:screenshot hook copies each screenshot
 * from cypress/screenshots/ to docs/screenshots/ automatically.
 *
 * Viewport: 1280×800 as documented in README.md contributor note.
 */

const VIEWPORT_W = 1280;
const VIEWPORT_H = 800;
// Same fixed timestamp used across all visual tests (2026-03-24 12:00 UTC)
const FIXED_DATE = new Date('2026-03-24T12:00:00.000Z').getTime();

/**
 * Shared prep: disable animations + hide notification toasts via CSS.
 * No Angular events are fired, so data-load timing is unaffected.
 */
function prepSnap(): void {
  cy.disableAnimations();
  cy.document().then((doc) => {
    if (!doc.getElementById('cy-hide-notifications')) {
      const s = doc.createElement('style');
      s.id = 'cy-hide-notifications';
      s.innerHTML = '.notification-container { display: none !important; }';
      doc.head.appendChild(s);
    }
  });
  cy.tick(1000);
  cy.waitForAngular();
}

/**
 * Capture a 1280×720 screenshot of the TOP of the page (no scroll needed).
 */
function snap(name: string): void {
  prepSnap();
  cy.screenshot(name, { overwrite: true, capture: 'viewport' });
}

/**
 * Scroll to a specific element then capture the viewport.
 *
 * Strategy:
 *  1. Compute the element's absolute document Y from getBoundingClientRect()
 *     + win.scrollY (works regardless of current scroll position).
 *  2. Call win.scrollTo({ behavior: 'instant' }) directly on the AUT window —
 *     more reliable than scrollIntoView() in headless Electron.
 *  3. capture:'viewport' — single frame, no fullPage stitching, so the sticky
 *     header appears exactly once at the top (natural app chrome).
 *
 * @param offsetAbove  How many px to show above the target (default 180).
 *   Tune per-screenshot to include the desired amount of surrounding context.
 */
function snapAt(name: string, scrollToSelector: string, offsetAbove = 180): void {
  prepSnap();
  cy.get(scrollToSelector, { timeout: 10000 }).then(($el) => {
    const aw = $el[0].ownerDocument.defaultView!;
    const top = $el[0].getBoundingClientRect().top;
    const absY = top + aw.scrollY;
    const scrollTo = Math.max(0, absY - offsetAbove);
    const docH = aw.document.documentElement.scrollHeight;
    const innerH = aw.innerHeight;
    // Write debug info so we can read it after the run
    cy.writeFile(
      'cypress/snapdebug.txt',
      `${name}: docH=${docH} innerH=${innerH} scrollYBefore=${aw.scrollY} rectTop=${top} absY=${absY} scrollTo=${scrollTo}\n`,
      { flag: 'a' },
    );
    if (scrollTo > 0) {
      // Use Cypress's own scroll command — handles timing correctly in headless Electron
      cy.scrollTo(0, scrollTo, { ensureScrollable: false, duration: 0 });
    }
  });
  cy.screenshot(name, { overwrite: true, capture: 'viewport' });
}

/**
 * Wait for at least one birthday card to be rendered.
 * Guards against taking a screenshot before the NgRx IDB effect resolves.
 */
function waitForCards(): void {
  cy.get('[data-testid="edit-birthday-button"]', { timeout: 10000 })
    .should('have.length.at.least', 1);
}

function visitFreshReadme(darkMode = false): void {
  cy.clearLocalStorage();
  cy.clearCookies();
  cy.clearIndexedDB();
  cy.clock(FIXED_DATE);
  cy.visit('/', {
    onBeforeLoad(win) {
      if (darkMode) {
        win.localStorage.setItem('birthday-app-dark-mode', 'true');
      }
    },
  });
  cy.waitForAngular();
  // Drain the 600 ms theme-transition timer so .theme-transitioning is gone
  cy.tick(700);
}

describe('README Screenshots', () => {
  beforeEach(() => {
    cy.viewport(VIEWPORT_W, VIEWPORT_H);
  });

  // 1 — dashboard.png -------------------------------------------------------
  it('dashboard', () => {
    visitFreshReadme();
    cy.seedVisualTestData();
    waitForCards();
    snap('dashboard');
  });

  // 2 — birthday-form.png ---------------------------------------------------
  // Show the collapsible "Add New Birthday" card expanded with form fields
  it('birthday-form', () => {
    visitFreshReadme();
    cy.expandBirthdayForm();
    // Scroll to the card container so its title + form fields both appear below the header
    snapAt('birthday-form', '.add-birthday-card', 160);
  });

  // 3 — dark-mode.png -------------------------------------------------------
  it('dark-mode', () => {
    visitFreshReadme(true);
    cy.seedVisualTestData();
    waitForCards();
    snap('dark-mode');
  });

  // 4 — category-filter.png -------------------------------------------------
  // Activate the Family filter, then show chips + filtered cards in viewport
  it('category-filter', () => {
    visitFreshReadme();
    cy.seedVisualTestData();
    waitForCards();
    cy.get('[data-testid="category-filter-family"]')
      .find('.category-select-btn')
      .click({ force: true });
    cy.waitForAngular();
    // Show stats + filter chips + top of filtered birthday list
    snapAt('category-filter', '[data-testid="category-filter-family"]', 280);
  });

  // 5 — stats-chart.png -----------------------------------------------------
  // Wait for deferred chart to render then scroll to it
  it('stats-chart', () => {
    visitFreshReadme();
    cy.seedVisualTestData();
    waitForCards();
    cy.get('.chart-card', { timeout: 8000 }).should('exist');
    snapAt('stats-chart', '.chart-card', 180);
  });

  // 6 — sync-status.png -----------------------------------------------------
  // Simulate offline so the header badge reads "Offline"
  it('sync-status', () => {
    visitFreshReadme();
    cy.seedVisualTestData();
    waitForCards();
    cy.window().then((win) => {
      Object.defineProperty(win.navigator, 'onLine', { value: false, configurable: true });
      win.dispatchEvent(new win.Event('offline'));
    });
    cy.waitForAngular();
    snap('sync-status');
  });
});
