/**
 * Chart Viewport Tests — @defer(on viewport) rendering
 *
 * Verifies that app-birthday-chart renders correctly after Angular's
 * @defer(on viewport) trigger fires, and that its ARIA/DOM structure is correct.
 *
 * ── Why a dedicated file? ────────────────────────────────────────────────────
 * The chart in dashboard.component.html is wrapped in:
 *
 *   @defer (on viewport) {
 *     <app-birthday-chart …></app-birthday-chart>
 *   } @placeholder {
 *     <div class="chart-placeholder">…</div>
 *   }
 *
 * Angular uses IntersectionObserver internally to detect when the placeholder
 * enters the viewport. In Cypress headless mode (no GPU compositor) the real
 * IntersectionObserver never fires for programmatic scrolls, so the deferred
 * block stays as the placeholder and the chart is never rendered.
 *
 * ── Fix applied here ─────────────────────────────────────────────────────────
 * In beforeEach, after seeding data we call:
 *   cy.get('app-birthday-chart').scrollIntoView();
 *   cy.wait(500);
 * This scrolls the placeholder into view and gives Angular time to swap in the
 * deferred block, working in both headless CI and headed mode without patching
 * IntersectionObserver.
 *
 * ── Running ──────────────────────────────────────────────────────────────────
 *   npx cypress run --spec cypress/e2e/chart-viewport.cy.ts
 */

describe('Chart — @defer(on viewport) rendering', () => {
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
    // Guard: chart must be in the DOM before any test runs
    cy.get('app-birthday-chart', { timeout: 8000 }).should('exist');
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  it('replaces the placeholder with app-birthday-chart after deferred trigger', () => {
    // Placeholder must disappear once the deferred block renders
    cy.get('.chart-placeholder').should('not.exist');
    cy.get('app-birthday-chart', { timeout: 8000 }).should('exist');
  });

  it('chart card is visible on the page', () => {
    cy.get('app-birthday-chart .chart-card').should('be.visible');
  });

  it('renders one bar column per month (12 months)', () => {
    cy.get('app-birthday-chart .chart-bar').should('have.length', 12);
  });

  // ── ARIA / accessible structure ────────────────────────────────────────────

  it('<figure> has aria-label and aria-describedby', () => {
    cy.get('app-birthday-chart figure.chart-figure').should(($fig) => {
      expect($fig.attr('aria-label'), 'aria-label').to.be.a('string').and.not.empty;
      expect($fig.attr('aria-describedby'), 'aria-describedby').to.be.a('string').and.not.empty;
    });
  });

  it('sr-only <figcaption> id matches the aria-describedby on <figure>', () => {
    cy.get('app-birthday-chart figure.chart-figure').then(($fig) => {
      const descId = $fig.attr('aria-describedby') as string;
      cy.get(`app-birthday-chart figcaption#${descId}.sr-only`)
        .should('exist')
        .invoke('text')
        .should('have.length.greaterThan', 0);
    });
  });

  it('visual .chart-container carries aria-hidden="true"', () => {
    cy.get('app-birthday-chart .chart-container')
      .should('have.attr', 'aria-hidden', 'true');
  });

  it('sr-only <table> has aria-label, <caption>, two <thead> columns and 12 data rows', () => {
    cy.get('app-birthday-chart table.sr-only').should(($table) => {
      expect($table.attr('aria-label'), 'table aria-label').to.be.a('string').and.not.empty;
    });
    cy.get('app-birthday-chart table.sr-only').within(() => {
      cy.get('caption').should('exist');
      cy.get('thead th').should('have.length', 2);
      cy.get('tbody tr').should('have.length', 12);
    });
  });

  it('.chart-bar elements carry no role or aria-label (visual bars are aria-hidden via parent)', () => {
    cy.get('app-birthday-chart .chart-bar').each(($bar) => {
      expect($bar.attr('role'), 'role').to.be.undefined;
      expect($bar.attr('aria-label'), 'aria-label').to.be.undefined;
    });
  });

  // ── Data integrity ─────────────────────────────────────────────────────────

  it('at least one bar has a non-zero count label when birthdays are present', () => {
    // seedVisualTestData seeds 4 birthdays across different months
    cy.get('app-birthday-chart .bar-value').should('have.length.greaterThan', 0);
  });

  it('current-month bar is highlighted with the .current-month CSS class', () => {
    cy.get('app-birthday-chart .bar.current-month').should('have.length', 1);
  });
});
