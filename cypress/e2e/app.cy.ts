describe('Birthday Reminder App', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.clearIndexedDB();
    cy.visit('/', { timeout: 15000 });
    cy.get('.app-header', { timeout: 10000 }).should('be.visible');
  });

  it('should display the app title', () => {
    cy.contains('Birthday Memories').should('be.visible');
  });

  it('should display empty state when no birthdays', () => {
    cy.contains('Want to explore the app?').should('be.visible');
    cy.contains('Show Demo').should('be.visible');
  });

  it('should display add birthday form', () => {
    cy.contains('Add New Birthday').should('be.visible');
  });

  it('should load dashboard after adding test data', () => {
    cy.contains('Show Demo').click();

    cy.get('.dashboard-container', { timeout: 15000 }).should('exist');
    cy.contains('Dashboard & Statistics').should('be.visible');
  });
});
