describe('Category Filter', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.clearIndexedDB();
    cy.visit('/', { timeout: 15000 });
    cy.waitForAngular();

    // Add first birthday (Family)
    cy.expandBirthdayForm();
    cy.get('[data-testid="birthday-name-input"]').type('Family Member');
    cy.get('[data-testid="birthday-date-input"]').type('05/15/1990');
    cy.get('[data-testid="category-select"]').click();
    cy.contains('mat-option', 'Family').click();
    cy.get('[data-testid="save-birthday-button"]').click();

    cy.get('.dashboard-container', { timeout: 10000 }).should('exist');

    // Form stays expanded after save - fill in the second birthday
    cy.get('[data-testid="birthday-name-input"]', { timeout: 15000 })
      .should('be.visible')
      .clear()
      .type('Friend Person');

    cy.get('[data-testid="birthday-date-input"]')
      .should('be.visible')
      .clear()
      .type('08/20/1985');

    cy.get('[data-testid="category-select"]').click();
    cy.contains('mat-option', 'Friends').click();
    cy.get('[data-testid="save-birthday-button"]').click();

    cy.get('.dashboard-container', { timeout: 10000 }).should('exist');
  });

  it('should filter birthdays by category', () => {
    cy.contains('Family Member').should('be.visible');
    cy.contains('Friend Person').should('be.visible');

    cy.get('[data-testid="category-filter-family"]').click();

    cy.contains('Family Member').should('be.visible');
    cy.contains('Friend Person').should('not.exist');
  });

  it('should clear category filter', () => {
    cy.get('[data-testid="category-filter-family"]').click();
    cy.contains('Friend Person').should('not.exist');

    cy.get('[data-testid="clear-filter-button"]').click();

    cy.contains('Family Member').should('be.visible');
    cy.contains('Friend Person').should('be.visible');
  });

  it('should display category count', () => {
    cy.get('[data-testid="category-filter-family"]').should('contain', '1');
    cy.get('[data-testid="category-filter-friends"]').should('contain', '1');
  });
});
