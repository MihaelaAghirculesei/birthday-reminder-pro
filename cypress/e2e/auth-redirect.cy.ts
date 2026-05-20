/**
 * Auth guard — redirect tests
 *
 * Verifies that protected routes (/scheduled-messages, /calendar-sync) redirect
 * unauthenticated users back to the root dashboard "/".
 *
 * Strategy: visit the route directly (no __Secure-fb_auth_hint cookie), assert the
 * URL lands at "/" and the dashboard is rendered. In the anonymous fast-path,
 * initAuthListener() never loads Firebase and emits authInitialized=true immediately,
 * so the guard resolves quickly without any async wait.
 */

describe('Auth guard — unauthenticated redirect', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.clearIndexedDB();
  });

  it('redirects /scheduled-messages to / when not signed in', () => {
    cy.visit('/scheduled-messages');
    cy.location('pathname', { timeout: 8000 }).should('eq', '/');
    cy.get('.app-header').should('be.visible');
  });

  it('redirects /calendar-sync to / when not signed in', () => {
    cy.visit('/calendar-sync');
    cy.location('pathname', { timeout: 8000 }).should('eq', '/');
    cy.get('.app-header').should('be.visible');
  });

  it('dashboard (/) is accessible without authentication', () => {
    cy.visit('/');
    cy.waitForAngular();
    cy.get('[data-testid="add-birthday-button"]').should('be.visible');
  });

  it('sign-in button is visible immediately for anonymous users', () => {
    cy.visit('/');
    cy.waitForAngular();
    // Loading state must resolve without waiting for Firebase (fast path)
    cy.get('app-auth-button button').contains('Sign in').should('be.visible');
  });

  it('unknown routes redirect to /', () => {
    cy.visit('/nonexistent-route');
    cy.location('pathname', { timeout: 5000 }).should('eq', '/');
  });
});
