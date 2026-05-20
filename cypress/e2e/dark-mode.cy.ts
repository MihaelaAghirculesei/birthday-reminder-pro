/**
 * Dark mode and language switch — behavioral tests
 *
 * Verifies:
 * 1. Clicking "Dark Theme" in the Settings menu adds dark-theme class to body.
 * 2. Dark mode preference persists across page reload.
 * 3. Clicking "Light Theme" (shown when dark mode is on) removes the class.
 * 4. Clicking "Italiano" in the Settings menu switches the UI language.
 * 5. Language preference persists across page reload.
 *
 * Strategy: interact via the nav-strip Settings dropdown (visible at
 * default Cypress viewport 1280×720, which is above the 1010px breakpoint).
 * cy.disableAnimations() prevents mat-menu closing animations from blocking
 * subsequent menu open calls within the same test.
 */

describe('Dark mode — toggle and persistence', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.clearIndexedDB();
    cy.visit('/');
    cy.waitForAngular();
    cy.disableAnimations();
  });

  it('enables dark mode via Settings menu', () => {
    cy.contains('.nav-strip-item', 'Settings').click();
    cy.contains('Dark Theme').click();
    cy.get('body').should('have.class', 'dark-theme');
  });

  it('dark mode persists across reload', () => {
    cy.contains('.nav-strip-item', 'Settings').click();
    cy.contains('Dark Theme').click();
    cy.get('body').should('have.class', 'dark-theme');

    cy.reload();
    cy.waitForAngular();
    cy.get('body').should('have.class', 'dark-theme');
  });

  it('disables dark mode via Settings menu (Light Theme button)', () => {
    // Enable first
    cy.contains('.nav-strip-item', 'Settings').click();
    cy.contains('Dark Theme').click();
    cy.get('body').should('have.class', 'dark-theme');

    // When dark mode is on, the button label switches to 'Light Theme'
    cy.contains('.nav-strip-item', 'Settings').click();
    cy.contains('Light Theme').click();
    cy.get('body').should('not.have.class', 'dark-theme');
  });
});

describe('Language switch', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.clearIndexedDB();
    cy.visit('/');
    cy.waitForAngular();
    cy.disableAnimations();
  });

  it('switches UI language to Italian via Settings menu', () => {
    // In English the LANG.SWITCH button shows 'Italiano'
    cy.contains('.nav-strip-item', 'Settings').click();
    cy.contains('Italiano').click();

    // After switching to Italian, NAV.SETTINGS translates to 'Impostazioni'.
    // Use data-testid so the click is language-independent.
    cy.get('[data-testid="nav-settings-btn"]').click();
    cy.contains('English').should('be.visible');
  });

  it('language preference persists across reload', () => {
    cy.contains('.nav-strip-item', 'Settings').click();
    cy.contains('Italiano').click();

    cy.reload();
    cy.waitForAngular();
    cy.disableAnimations();

    // After reload in Italian, the switch button still shows 'English'.
    // Use data-testid so the click is language-independent.
    cy.get('[data-testid="nav-settings-btn"]').click();
    cy.contains('English').should('be.visible');
  });
});
