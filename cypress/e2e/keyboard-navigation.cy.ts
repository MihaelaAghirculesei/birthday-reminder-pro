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
    cy.disableAnimations();
  });

  it('Escape key closes the edit birthday dialog', () => {
    cy.expandBirthdayForm();
    cy.get('[data-testid="birthday-name-input"]').type('Esc Test User');
    cy.get('[data-testid="birthday-date-input"]').type('08/08/1988').blur();
    cy.get('[data-testid="save-birthday-button"]').click();
    cy.contains('Esc Test User', { timeout: 10000 }).should('be.visible');
    // Wait for zone stability: NgRx IDB-write effect + @expandCollapse leave animation
    // must finish before clicking edit, otherwise the lazy dialog import can be dropped.
    cy.waitForAngular();

    cy.get('[data-testid="edit-birthday-button"]').first().click();
    // editBirthday() does a lazy import() before opening the dialog; 15 s covers
    // the module-load round-trip and any remaining animation delay.
    cy.get('.dialog-container', { timeout: 15000 }).should('be.visible');

    // CDK auto-focuses the first tabbable element in the dialog (the name input).
    // Type {esc} on whichever element CDK has focused so the keydown bubbles to
    // the window and fires the component's @HostListener('window:keydown.escape').
    cy.focused().type('{esc}');
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
    cy.disableAnimations();
  });

  it('search input is focusable once birthdays exist', () => {
    cy.expandBirthdayForm();
    cy.get('[data-testid="birthday-name-input"]').type('Search Focus Test');
    cy.get('[data-testid="birthday-date-input"]').type('03/03/1993').blur();
    cy.get('[data-testid="save-birthday-button"]').click();
    // Wait for the birthday to appear and for zone stability (form collapse animation,
    // NgRx effects, and CDK restoreFocus must all complete before we assert focus).
    cy.contains('Search Focus Test', { timeout: 10000 }).should('be.visible');
    cy.waitForAngular();

    cy.get('[data-testid="search-input"]')
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
