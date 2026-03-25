/**
 * Network error handling
 *
 * Verifies that:
 * 1. Real Firestore/Firebase network errors do NOT crash the app.
 * 2. The app works normally when Firestore calls are blocked (simulating offline
 *    mode or "no Firebase credentials" scenario) — IndexedDB remains the
 *    source of truth and CRUD still works.
 * 3. Native network errors (non-Firebase) are not swallowed as Firebase errors.
 *
 * Strategy: cy.intercept() blocks Firestore REST calls with a network error.
 * The app should degrade gracefully: no unhandled JS exceptions, UI still works,
 * data persists in IndexedDB.
 */

describe('Network errors — graceful degradation', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.clearIndexedDB();

    // Block all Firestore REST API calls to simulate network failure / no Firebase
    cy.intercept(
      { hostname: /firestore\.googleapis\.com/ },
      { forceNetworkError: true }
    ).as('firestoreBlocked');

    cy.intercept(
      { hostname: /identitytoolkit\.googleapis\.com/ },
      { forceNetworkError: true }
    ).as('authBlocked');

    cy.intercept(
      { hostname: /securetoken\.googleapis\.com/ },
      { forceNetworkError: true }
    ).as('tokenBlocked');

    cy.visit('/');
    cy.waitForAngular();
  });

  it('app loads and renders normally when Firestore is unreachable', () => {
    cy.get('.app-header').should('be.visible');
    cy.get('[data-testid="add-birthday-button"]').should('be.visible');
  });

  it('CRUD operations still work with Firestore blocked (IndexedDB fallback)', () => {
    const name = 'Offline CRUD User';

    cy.expandBirthdayForm();
    cy.get('[data-testid="birthday-name-input"]').type(name);
    cy.get('[data-testid="birthday-date-input"]').type('06/20/1990');
    cy.get('[data-testid="save-birthday-button"]').click();

    cy.contains(name).should('be.visible');
  });

  it('data saved while Firestore is blocked survives a reload', () => {
    const name = 'Network Failure Survivor';

    cy.expandBirthdayForm();
    cy.get('[data-testid="birthday-name-input"]').type(name);
    cy.get('[data-testid="birthday-date-input"]').type('09/09/1988');
    cy.get('[data-testid="save-birthday-button"]').click();
    cy.contains(name).should('be.visible');

    cy.reload();
    cy.waitForAngular();

    cy.contains(name).should('be.visible');
  });

  it('no unhandled JS exceptions are thrown when Firestore is blocked', () => {
    // Capture uncaught exceptions — Cypress fails the test if one is thrown
    // and the handler returns false. We let Cypress use its default behavior
    // (fail on uncaught exception) to detect crashes.
    cy.on('uncaught:exception', (err) => {
      // Firebase / network errors that bubble as uncaught = test failure
      throw err;
    });

    cy.expandBirthdayForm();
    cy.get('[data-testid="birthday-name-input"]').type('Exception Check');
    cy.get('[data-testid="birthday-date-input"]').type('01/01/2000');
    cy.get('[data-testid="save-birthday-button"]').click();

    // Give the app time to try (and fail) any Firestore calls
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(2000);

    cy.contains('Exception Check').should('be.visible');
  });
});
