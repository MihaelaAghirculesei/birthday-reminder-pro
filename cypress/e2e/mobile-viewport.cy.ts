/**
 * Mobile viewport — responsive CRUD and navigation
 *
 * Verifies that all core interactions work at a typical mobile screen size
 * (375×812 — iPhone X).
 *
 * At width < 1010px the nav strip is hidden. Navigation is via the hamburger
 * button (.menu-btn) that opens a mat-menu panel.
 */

describe('Mobile viewport — navigation', () => {
  beforeEach(() => {
    cy.viewport(375, 812);
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.clearIndexedDB();
    cy.visit('/');
    cy.waitForAngular();
    cy.disableAnimations();
  });

  it('nav strip is hidden; hamburger menu button is visible', () => {
    cy.get('.nav-strip').should('not.be.visible');
    cy.get('.menu-btn').should('be.visible');
  });

  it('hamburger menu opens and shows Dashboard and Messages links', () => {
    cy.get('.menu-btn').click();
    // The nav-strip (display:none at mobile) also contains 'Dashboard'/'Messages'
    // links. Scope the assertions to the opened mat-menu panel so Cypress does not
    // pick up the hidden nav-strip items.
    cy.get('.nav-menu-main').contains('Dashboard').should('be.visible');
    cy.get('.nav-menu-main').contains('Messages').should('be.visible');
  });
});

describe('Mobile viewport — birthday CRUD', () => {
  beforeEach(() => {
    cy.viewport(375, 812);
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.clearIndexedDB();
    cy.visit('/');
    cy.waitForAngular();
  });

  it('adds a birthday at mobile viewport', () => {
    cy.expandBirthdayForm();
    cy.get('[data-testid="birthday-name-input"]').type('Mobile User');
    cy.get('[data-testid="birthday-date-input"]').type('07/07/1995');
    cy.get('[data-testid="save-birthday-button"]').click();
    cy.contains('Mobile User').should('be.visible');
  });

  it('deletes a birthday at mobile viewport', () => {
    cy.expandBirthdayForm();
    cy.get('[data-testid="birthday-name-input"]').type('Delete Mobile');
    cy.get('[data-testid="birthday-date-input"]').type('04/04/1990');
    cy.get('[data-testid="save-birthday-button"]').click();
    cy.contains('Delete Mobile').should('be.visible');

    // At mobile the .dashboard-toolbar is hidden (compact-hide). Open the
    // three-dot compact menu to reach the delete action.
    cy.get('.compact-menu-btn').first().click();
    cy.get('.birthday-item-menu [data-testid="delete-birthday-button"]').click();
    cy.get('.confirm-dialog', { timeout: 5000 }).should('be.visible');
    cy.get('.confirm-dialog .confirm-btn').click();
    cy.contains('Delete Mobile').should('not.exist');
  });

  it('data added on mobile persists across reload', () => {
    cy.expandBirthdayForm();
    cy.get('[data-testid="birthday-name-input"]').type('Mobile Reload');
    cy.get('[data-testid="birthday-date-input"]').type('11/22/1988');
    cy.get('[data-testid="save-birthday-button"]').click();
    cy.contains('Mobile Reload').should('be.visible');

    cy.reload();
    cy.waitForAngular();
    cy.contains('Mobile Reload').should('be.visible');
  });

  it('edits a birthday at mobile viewport', () => {
    cy.expandBirthdayForm();
    cy.get('[data-testid="birthday-name-input"]').type('Before Edit Mobile');
    cy.get('[data-testid="birthday-date-input"]').type('03/15/1992');
    cy.get('[data-testid="save-birthday-button"]').click();
    cy.contains('Before Edit Mobile').should('be.visible');

    // At mobile the .dashboard-toolbar is hidden (compact-hide). Open the
    // three-dot compact menu to reach the edit action.
    cy.get('.compact-menu-btn').first().click();
    cy.get('.birthday-item-menu [data-testid="edit-birthday-button"]').click();
    cy.get('.dialog-container').should('be.visible');
    cy.get('.dialog-container [data-testid="birthday-name-input"]').clear().type('After Edit Mobile');
    cy.get('.dialog-container [data-testid="save-birthday-button"]').click();

    cy.contains('After Edit Mobile').should('be.visible');
    cy.contains('Before Edit Mobile').should('not.exist');
  });
});

describe('Mobile viewport — 320px layout integrity (iPhone SE)', () => {
  // CRUD mechanics are already covered at 375px above; this suite guards the
  // narrowest realistic width against horizontal-overflow regressions only.
  beforeEach(() => {
    cy.viewport(320, 700);
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.clearIndexedDB();
    cy.visit('/');
    cy.waitForAngular();
    cy.disableAnimations();
  });

  function assertNoHorizontalOverflow(): void {
    cy.document().then((doc) => {
      expect(doc.documentElement.scrollWidth).to.be.at.most(320);
    });
  }

  it('empty dashboard has no horizontal overflow', () => {
    assertNoHorizontalOverflow();
  });

  it('hamburger nav menu has no horizontal overflow', () => {
    cy.get('.menu-btn').click();
    cy.get('.nav-menu-main').should('be.visible');
    assertNoHorizontalOverflow();
  });

  it('expanded add-birthday form has no horizontal overflow', () => {
    cy.expandBirthdayForm();
    assertNoHorizontalOverflow();
  });

  it('dashboard with a birthday card has no horizontal overflow', () => {
    cy.expandBirthdayForm();
    cy.get('[data-testid="birthday-name-input"]').type('Narrow Viewport');
    cy.get('[data-testid="birthday-date-input"]').type('01/01/2000');
    cy.get('[data-testid="save-birthday-button"]').click();
    cy.contains('Narrow Viewport').should('be.visible');
    assertNoHorizontalOverflow();
  });
});
