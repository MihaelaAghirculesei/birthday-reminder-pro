/**
 * Keyboard navigation — focus, Escape, and form interactions
 *
 * Verifies that the app is operable via keyboard:
 * - All form inputs can individually receive focus.
 * - The save button is focusable when the form is valid.
 * - Pressing Escape on a mat-dialog-container closes the dialog.
 * - The search input receives focus correctly.
 * - The skip-to-content link is accessible and focusable.
 *
 * Note: Tab-order traversal requires cypress-real-events (not installed).
 * These tests verify individual focusability, not the full tab sequence.
 * Add cypress-real-events to unlock full tab-order assertions.
 */

describe('Keyboard navigation — add birthday form', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.clearIndexedDB();
    cy.visit('/');
    cy.waitForAngular();
  });

  it('all form inputs are individually focusable', () => {
    cy.expandBirthdayForm();
    cy.get('[data-testid="birthday-name-input"]').focus().should('be.focused');
    cy.get('[data-testid="birthday-date-input"]').focus().should('be.focused');
    cy.get('[data-testid="reminder-days-input"]').focus().should('be.focused');
  });

  it('save button is focusable when name and date are filled', () => {
    cy.expandBirthdayForm();
    cy.get('[data-testid="birthday-name-input"]').type('Focus Test');
    cy.get('[data-testid="birthday-date-input"]').type('01/01/1990');
    cy.get('[data-testid="save-birthday-button"]')
      .should('not.be.disabled')
      .focus()
      .should('be.focused');
  });
});

describe('Keyboard navigation — dialogs', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.clearIndexedDB();
    cy.visit('/');
    cy.waitForAngular();
  });

  it('Escape key closes the edit birthday dialog', () => {
    cy.expandBirthdayForm();
    cy.get('[data-testid="birthday-name-input"]').type('Esc Test User');
    cy.get('[data-testid="birthday-date-input"]').type('08/08/1988');
    cy.get('[data-testid="save-birthday-button"]').click();
    cy.contains('Esc Test User').should('be.visible');

    cy.get('[data-testid="edit-birthday-button"]').first().click();
    cy.get('.dialog-container').should('be.visible');

    // mat-dialog-container has tabindex="-1" and is focusable; CDK handles Escape
    cy.get('mat-dialog-container').focus().type('{esc}');
    cy.get('.dialog-container').should('not.exist');
  });
});

describe('Keyboard navigation — search and skip link', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.clearIndexedDB();
    cy.visit('/');
    cy.waitForAngular();
  });

  it('search input is focusable once birthdays exist', () => {
    cy.expandBirthdayForm();
    cy.get('[data-testid="birthday-name-input"]').type('Search Focus Test');
    cy.get('[data-testid="birthday-date-input"]').type('03/03/1993');
    cy.get('[data-testid="save-birthday-button"]').click();

    cy.get('[data-testid="search-input"]', { timeout: 8000 })
      .focus()
      .should('be.focused');
  });

  it('skip-to-content link exists and is focusable', () => {
    cy.get('a[href="#main-content"]')
      .should('exist')
      .focus()
      .should('be.focused');
  });
});
