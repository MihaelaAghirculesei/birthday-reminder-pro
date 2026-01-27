describe('Offline Mode', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.clearIndexedDB();
    cy.visit('/', { timeout: 15000 });
  });

  it('should persist data in IndexedDB', () => {
    cy.get('[data-testid="add-birthday-button"]').click();
    cy.get('[data-testid="birthday-name-input"]', { timeout: 10000 }).should('be.visible').type('Persistent User');
    cy.get('[data-testid="birthday-date-input"]').type('1990-03-15');
    cy.get('[data-testid="save-birthday-button"]').click();

    cy.contains('Persistent User').should('be.visible');

    cy.reload();

    cy.contains('Persistent User').should('be.visible');
  });

  it('should work offline after first load', () => {
    cy.get('[data-testid="add-birthday-button"]').click();
    cy.get('[data-testid="birthday-name-input"]', { timeout: 10000 }).should('be.visible').type('Offline User');
    cy.get('[data-testid="birthday-date-input"]').type('1995-07-20');
    cy.get('[data-testid="save-birthday-button"]').click();

    cy.window().then((win) => {
      cy.stub(win.navigator, 'onLine').value(false);
    });

    cy.contains('Offline User').should('be.visible');
  });
});
