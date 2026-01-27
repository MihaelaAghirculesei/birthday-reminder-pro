describe('Search Functionality', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.clearIndexedDB();
    cy.visit('/', { timeout: 15000 });

    const birthdays = [
      { name: 'Alice Johnson', date: '01/15/1990' },
      { name: 'Bob Smith', date: '05/20/1985' },
      { name: 'Charlie Brown', date: '09/10/1992' }
    ];

    cy.get('[data-testid="add-birthday-button"]').click();
    cy.get('[data-testid="birthday-name-input"]', { timeout: 10000 }).should('be.visible');

    birthdays.forEach((birthday, index) => {
      if (index > 0) {
        cy.wait(500);
      }

      cy.get('[data-testid="birthday-name-input"]')
        .should('be.visible')
        .clear()
        .type(birthday.name);

      cy.get('[data-testid="birthday-date-input"]')
        .should('be.visible')
        .clear()
        .type(birthday.date);

      cy.get('[data-testid="save-birthday-button"]').click();
    });

    cy.get('.dashboard-container', { timeout: 10000 }).should('exist');
    cy.wait(1000);
    cy.get('.dashboard-search-field input', { timeout: 10000 }).should('be.visible');
  });

  it('should search birthdays by name', () => {
    cy.contains('Alice Johnson').should('be.visible');
    cy.contains('Bob Smith').should('be.visible');
    cy.contains('Charlie Brown').should('be.visible');

    cy.get('.dashboard-search-field input').type('Alice', { force: true });

    cy.contains('Alice Johnson').should('be.visible');
    cy.contains('Bob Smith').should('not.exist');
    cy.contains('Charlie Brown').should('not.exist');
  });

  it('should clear search and show all birthdays', () => {
    cy.get('.dashboard-search-field input').type('Alice', { force: true });
    cy.contains('Bob Smith').should('not.exist');

    cy.get('.dashboard-search-field input').clear({ force: true });

    cy.contains('Alice Johnson').should('be.visible');
    cy.contains('Bob Smith').should('be.visible');
    cy.contains('Charlie Brown').should('be.visible');
  });

  it('should show no results message for non-existent search', () => {
    cy.get('.dashboard-search-field input').type('NonExistent', { force: true });

    cy.contains('No birthdays found').should('be.visible');
  });

  it('should be case insensitive', () => {
    cy.get('.dashboard-search-field input').type('alice', { force: true });
    cy.contains('Alice Johnson').should('be.visible');

    cy.get('.dashboard-search-field input').clear({ force: true }).type('ALICE', { force: true });
    cy.contains('Alice Johnson').should('be.visible');
  });
});
