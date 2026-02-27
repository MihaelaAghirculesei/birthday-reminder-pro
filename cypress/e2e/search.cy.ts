describe('Search Functionality', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.clearIndexedDB();
    cy.visit('/');
    cy.waitForAngular();

    const birthdays = [
      { name: 'Alice Johnson', date: '01/15/1990' },
      { name: 'Bob Smith', date: '05/20/1985' },
      { name: 'Charlie Brown', date: '09/10/1992' }
    ];

    birthdays.forEach((birthday) => {
      cy.expandBirthdayForm();

      cy.get('[data-testid="birthday-name-input"]', { timeout: 10000 })
        .should('be.visible')
        .clear()
        .type(birthday.name);

      cy.get('[data-testid="birthday-date-input"]')
        .should('be.visible')
        .clear()
        .type(birthday.date);

      cy.get('[data-testid="save-birthday-button"]').click();
      // Wait for form close animation to complete before next iteration
      cy.get('[data-testid="birthday-name-input"]', { timeout: 5000 }).should('not.be.visible');
    });

    cy.get('.dashboard-container', { timeout: 15000 }).should('exist');
    cy.get('.dashboard-search-field input', { timeout: 15000 }).should('be.visible');
  });

  it('should search birthdays by name', () => {
    cy.contains('Alice Johnson').should('exist');
    cy.contains('Bob Smith').should('exist');
    cy.contains('Charlie Brown').should('exist');

    cy.get('.dashboard-search-field input').type('Alice', { force: true });

    cy.contains('Alice Johnson').should('exist');
    cy.contains('Bob Smith').should('not.exist');
    cy.contains('Charlie Brown').should('not.exist');
  });

  it('should clear search and show all birthdays', () => {
    cy.get('.dashboard-search-field input').type('Alice', { force: true });
    cy.contains('Bob Smith').should('not.exist');

    cy.get('.dashboard-search-field input').clear({ force: true });

    cy.contains('Alice Johnson').should('exist');
    cy.contains('Bob Smith').should('exist');
    cy.contains('Charlie Brown').should('exist');
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
