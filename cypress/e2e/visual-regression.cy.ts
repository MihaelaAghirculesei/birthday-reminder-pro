/**
 * Visual Regression Tests — local screenshots via cy.screenshot()
 *
 * Strategy
 * ─────────
 * • cy.clock() freezes Date to 2026-03-24 before each visit so "days until
 *   birthday" counters are always deterministic across CI runs.
 * • cy.seedVisualTestData() writes 4 fixtures directly into IndexedDB, then
 *   reloads so NgRx effects pick them up on boot (no UI interaction needed).
 * • cy.visualSnapshot() disables animations, drains the Angular zone, then
 *   saves a screenshot to cypress/screenshots/ (gitignored).
 *
 * Running:
 *   npm run e2e:visual
 *   → Screenshots saved locally; compare manually or diff with a tool like pixelmatch.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** 2026-03-24 12:00 UTC — same epoch used in commands.ts seed data */
function visitFresh(darkMode = false): void {
  cy.clearLocalStorage();
  cy.clearCookies();
  cy.clearIndexedDB();

  // Freeze Date BEFORE visit — Angular will use this for all new Date() calls.
  // Value must match VISUAL_FIXED_TIMESTAMP defined in commands.ts.
  cy.clock(new Date('2026-03-24T12:00:00.000Z').getTime());

  cy.visit('/', {
    onBeforeLoad(win) {
      if (darkMode) {
        win.localStorage.setItem('birthday-app-dark-mode', 'true');
      }
    },
  });

  cy.waitForAngular();

  // Tick past the 600 ms theme-transition timer so body never has
  // the .theme-transitioning class when the screenshot is taken
  cy.tick(700);
}

// ---------------------------------------------------------------------------
// Suite 1 — Empty state (no birthdays)
// ---------------------------------------------------------------------------

describe('Visual Regression — Empty state', () => {
  it('empty state · light theme', () => {
    visitFresh();
    cy.visualSnapshot('Empty state — light');
  });

  it('empty state · dark theme', () => {
    visitFresh(true);
    cy.visualSnapshot('Empty state — dark');
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — Dashboard with birthday cards
// ---------------------------------------------------------------------------

describe('Visual Regression — Dashboard with data', () => {
  beforeEach(() => {
    visitFresh();
    cy.seedVisualTestData();
  });

  it('dashboard · light theme · all widths', () => {
    // Use cy.viewport() in sibling tests to capture specific breakpoints
    cy.visualSnapshot('Dashboard — light');
  });

  it('dashboard · dark theme · all widths', () => {
    cy.enableDarkMode();
    cy.visualSnapshot('Dashboard — dark');
  });

  it('dashboard · mobile only (375 px)', () => {
    cy.viewport(375, 812);
    cy.visualSnapshot('Dashboard — mobile 375px');
  });

  it('dashboard · tablet only (768 px)', () => {
    cy.viewport(768, 1024);
    cy.visualSnapshot('Dashboard — tablet 768px');
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — Add-birthday form (expanded)
// ---------------------------------------------------------------------------

describe('Visual Regression — Add birthday form', () => {
  beforeEach(() => {
    visitFresh();
  });

  it('form expanded · light theme', () => {
    cy.expandBirthdayForm();
    cy.visualSnapshot('Add form — expanded · light');
  });

  it('form expanded · dark theme', () => {
    cy.enableDarkMode();
    cy.expandBirthdayForm();
    cy.visualSnapshot('Add form — expanded · dark');
  });

  it('form · validation errors visible', () => {
    cy.expandBirthdayForm();
    // Touch the required date field without entering a value → triggers ErrorStateMatcher
    cy.get('[data-testid="birthday-date-input"]').focus().blur();
    cy.get('#add-birthday-form mat-error').should('be.visible');
    cy.visualSnapshot('Add form — validation errors · light');
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — Search
// ---------------------------------------------------------------------------

describe('Visual Regression — Search', () => {
  beforeEach(() => {
    visitFresh();
    cy.seedVisualTestData();
  });

  it('search · results found', () => {
    cy.get('[data-testid="search-input"]').type('Alice', { force: true });
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(300); // debounce
    cy.visualSnapshot('Search — results found · light');
  });

  it('search · no results', () => {
    cy.get('[data-testid="search-input"]').type('xyznonexistent', { force: true });
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(300);
    cy.visualSnapshot('Search — empty results · light');
  });
});

// ---------------------------------------------------------------------------
// Suite 5 — Category filter
// ---------------------------------------------------------------------------

describe('Visual Regression — Category filter', () => {
  beforeEach(() => {
    visitFresh();
    cy.seedVisualTestData();
  });

  it('category filter · family active', () => {
    cy.get('[data-testid="category-filter-family"]').find('.category-select-btn').scrollIntoView().click({ force: true });
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(300);
    cy.visualSnapshot('Category filter — Family · light');
  });

  it('category filter · friends active · dark theme', () => {
    cy.enableDarkMode();
    cy.get('[data-testid="category-filter-friends"]').find('.category-select-btn').scrollIntoView().click({ force: true });
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(300);
    cy.visualSnapshot('Category filter — Friends · dark');
  });
});

// ---------------------------------------------------------------------------
// Suite 6 — Edit dialog
// ---------------------------------------------------------------------------

describe('Visual Regression — Edit birthday dialog', () => {
  beforeEach(() => {
    visitFresh();
    cy.seedVisualTestData();
  });

  it('edit dialog · light theme', () => {
    cy.disableAnimations();
    cy.get('[data-testid="edit-birthday-button"]').first().click();
    cy.get('.dialog-container', { timeout: 8000 }).should('be.visible');
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(300);
    cy.visualSnapshot('Edit dialog — light');
  });

  it('edit dialog · dark theme', () => {
    cy.enableDarkMode();
    cy.disableAnimations();
    cy.get('[data-testid="edit-birthday-button"]').first().click();
    cy.get('.dialog-container', { timeout: 8000 }).should('be.visible');
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(300);
    cy.visualSnapshot('Edit dialog — dark');
  });
});

// ---------------------------------------------------------------------------
// Suite 7 — Nav strip active states
// ---------------------------------------------------------------------------

describe('Visual Regression — Nav strip', () => {
  beforeEach(() => {
    visitFresh();
  });

  it('nav strip · default (Dashboard active) · light', () => {
    cy.visualSnapshot('Nav strip — Dashboard active · light');
  });

  it('nav strip · Settings menu open · light', () => {
    cy.disableAnimations();
    cy.get('[data-testid="nav-settings-btn"]').click();
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(100);
    cy.visualSnapshot('Nav strip — Settings menu open · light');
    cy.get('body').click(0, 0);
  });
});

// ---------------------------------------------------------------------------
// Suite 8 — Delete confirmation dialog
// ---------------------------------------------------------------------------

describe('Visual Regression — Delete confirmation dialog', () => {
  beforeEach(() => {
    visitFresh();
    cy.seedVisualTestData();
  });

  it('delete confirm dialog · light theme', () => {
    cy.disableAnimations();
    cy.get('[data-testid="delete-birthday-button"]').first().click();
    cy.get('.confirm-dialog', { timeout: 8000 }).should('be.visible');
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(200);
    cy.visualSnapshot('Delete confirm dialog — light');
  });
});
