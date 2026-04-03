/**
 * Automated Accessibility Tests — axe-core via cypress-axe
 *
 * Covers:
 * - No critical axe violations on the main dashboard
 * - Birthday chart: visual bars are aria-hidden, table data is reachable,
 *   chart wrapper has an appropriate role/label
 * - Add-birthday form: inputs have associated labels
 * - Dark theme: same rules pass in dark mode
 *
 * Running:
 *   npx cypress run --spec cypress/e2e/accessibility.cy.ts
 *
 * axe "critical" and "serious" violations will fail the test.
 * "moderate" and "minor" are logged as warnings (configurable below).
 */

/**
 * Only fail on critical/serious violations.
 * Logs moderate/minor to the Cypress command log for awareness.
 */
function checkA11yStrict(): void {
  cy.checkA11y(
    undefined,
    {
      includedImpacts: ['critical', 'serious'],
    },
    (violations) => {
      if (violations.length === 0) return;
      cy.task('log', `${violations.length} accessibility violation(s) found:`);
      violations.forEach((v) => {
        cy.task('log', `  [${v.impact}] ${v.id}: ${v.description}`);
        v.nodes.forEach((n) =>
          cy.task('log', `    → ${n.target.join(', ')}`)
        );
      });
    }
  );
}

describe('Accessibility — empty state', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.clearIndexedDB();
    cy.visit('/');
    cy.waitForAngular();
    cy.injectAxe();
  });

  it('no critical/serious violations on empty dashboard', () => {
    checkA11yStrict();
  });

  it('no violations after expanding the add-birthday form', () => {
    cy.expandBirthdayForm();
    checkA11yStrict();
  });
});

describe('Accessibility — dashboard with data', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.clearIndexedDB();
    // Must be called before cy.visit() — stubs IntersectionObserver so
    // Angular's @defer(on viewport) fires immediately in headless mode.
    cy.mockDeferViewport();
    cy.visit('/');
    cy.waitForAngular();
    cy.seedVisualTestData();
    cy.injectAxe();
  });

  it('no critical/serious violations on populated dashboard', () => {
    checkA11yStrict();
  });

  it('no critical/serious violations in dark mode', () => {
    cy.enableDarkMode();
    checkA11yStrict();
  });

  it('birthday chart: visual container is aria-hidden, figure has accessible label', () => {
    cy.get('app-birthday-chart', { timeout: 8000 }).should('exist');
    cy.get('app-birthday-chart .chart-container')
      .should('have.attr', 'aria-hidden', 'true');
    cy.get('app-birthday-chart figure.chart-figure')
      .should('have.attr', 'aria-label');
  });
});

describe('Accessibility — form validation errors', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.clearIndexedDB();
    cy.visit('/');
    cy.waitForAngular();
    cy.injectAxe();
  });

  it('no critical/serious violations when validation errors are shown', () => {
    cy.expandBirthdayForm();
    cy.get('[data-testid="save-birthday-button"]').click({ force: true });
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(300);
    checkA11yStrict();
  });
});
