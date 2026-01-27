describe('Birthday CRUD Operations', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.clearIndexedDB();
    cy.visit('/', { timeout: 15000 });
  });

  it('should add a new birthday', () => {
    cy.get('[data-testid="add-birthday-button"]').click();
    cy.get('[data-testid="birthday-name-input"]', { timeout: 10000 }).should('be.visible');

    cy.get('[data-testid="birthday-name-input"]').type('John Doe');
    cy.get('[data-testid="birthday-date-input"]').type('05/15/1990');
    cy.get('[data-testid="reminder-days-input"]').clear().type('7');

    cy.get('[data-testid="save-birthday-button"]').click();

    cy.get('.dashboard-container', { timeout: 10000 }).should('exist');
    cy.contains('John Doe').should('be.visible');
  });

  it('should edit an existing birthday', () => {
    cy.get('[data-testid="add-birthday-button"]').click();
    cy.get('[data-testid="birthday-name-input"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-testid="birthday-name-input"]').type('Jane Smith');
    cy.get('[data-testid="birthday-date-input"]').type('12/25/1985');
    cy.get('[data-testid="save-birthday-button"]').click();

    cy.get('.dashboard-container', { timeout: 10000 }).should('exist');
    cy.contains('Jane Smith').should('be.visible');

    cy.get('[data-testid="edit-birthday-button"]').first().click();

    cy.get('.dialog-container').should('be.visible');
    cy.get('.dialog-container [data-testid="birthday-name-input"]').clear().type('Jane Doe');
    cy.get('.dialog-container [data-testid="save-birthday-button"]').click();

    cy.contains('Jane Doe').should('be.visible');
    cy.contains('Jane Smith').should('not.exist');
  });

  it('should delete a birthday', () => {
    cy.get('[data-testid="add-birthday-button"]').click();
    cy.get('[data-testid="birthday-name-input"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-testid="birthday-name-input"]').type('Test User');
    cy.get('[data-testid="birthday-date-input"]').type('01/01/2000');
    cy.get('[data-testid="save-birthday-button"]').click();

    cy.get('.dashboard-container', { timeout: 10000 }).should('exist');
    cy.contains('Test User').should('be.visible');

    cy.get('[data-testid="delete-birthday-button"]').first().click();

    cy.contains('Test User').should('not.exist');
  });

  it('should cancel birthday creation', () => {
    cy.get('[data-testid="add-birthday-button"]').click();
    cy.get('[data-testid="birthday-name-input"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-testid="birthday-name-input"]').type('Cancelled User');

    cy.get('[data-testid="add-birthday-button"]').click();

    cy.get('[data-testid="birthday-name-input"]').should('not.be.visible');
    cy.get('.dashboard-container').should('not.exist');
  });
});
