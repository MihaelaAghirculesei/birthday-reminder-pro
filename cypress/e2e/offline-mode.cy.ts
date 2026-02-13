describe('Offline Mode', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.clearIndexedDB();
    cy.visit('/');
    cy.waitForAngular();
  });

  it('should persist data in IndexedDB', () => {
    cy.expandBirthdayForm();
    cy.get('[data-testid="birthday-name-input"]').type('Persistent User');
    cy.get('[data-testid="birthday-date-input"]').type('03/15/1990');
    cy.get('[data-testid="save-birthday-button"]').click();

    cy.contains('Persistent User').should('be.visible');

    cy.reload();

    cy.contains('Persistent User').should('be.visible');
  });

  it('should work offline after first load', () => {
    cy.expandBirthdayForm();
    cy.get('[data-testid="birthday-name-input"]').type('Offline User');
    cy.get('[data-testid="birthday-date-input"]').type('07/20/1995');
    cy.get('[data-testid="save-birthday-button"]').click();

    cy.window().then((win) => {
      cy.stub(win.navigator, 'onLine').value(false);
    });

    cy.contains('Offline User').should('be.visible');
  });
});
