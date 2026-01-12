describe('Notifications', () => {
  beforeEach(() => {
    cy.clearIndexedDB();
    cy.visit('/');
  });

  it('should display notification permission banner if supported', () => {
    cy.contains('Show Demo').click();
    cy.get('.dashboard-container', { timeout: 10000 }).should('exist');

    cy.get('body').then(($body) => {
      if ($body.find('.notification-banner').length > 0) {
        cy.get('.notification-banner').should('be.visible');
      } else {
        cy.log('Notification banner not displayed (permission already granted/denied)');
      }
    });
  });

  it('should dismiss notification banner if displayed', () => {
    cy.contains('Show Demo').click();
    cy.get('.dashboard-container', { timeout: 10000 }).should('exist');

    cy.get('body').then(($body) => {
      if ($body.find('.notification-banner').length > 0) {
        cy.get('.notification-banner').should('be.visible');
        cy.contains('Maybe Later').click();
        cy.get('.notification-banner').should('not.exist');
      } else {
        cy.log('Notification banner not displayed - test skipped');
      }
    });
  });

  it('should show success notification after adding birthday', () => {
    cy.get('[data-testid="add-birthday-button"]').click();
    cy.get('[data-testid="birthday-name-input"]').should('be.visible').type('Test User');
    cy.get('[data-testid="birthday-date-input"]').should('be.visible').type('01/01/1990');
    cy.get('[data-testid="save-birthday-button"]').click();

    cy.wait(1000);
    cy.contains('Test User added successfully!', { timeout: 10000 }).should('be.visible');
  });

  it('should close notification manually', () => {
    cy.get('[data-testid="add-birthday-button"]').click();
    cy.get('[data-testid="birthday-name-input"]').should('be.visible').type('Test User');
    cy.get('[data-testid="birthday-date-input"]').should('be.visible').type('01/01/1990');
    cy.get('[data-testid="save-birthday-button"]').click();

    cy.wait(1000);
    cy.contains('Test User added successfully!', { timeout: 10000 }).should('be.visible');
    cy.get('.notification .close-btn').first().click();
    cy.contains('Test User added successfully!').should('not.exist');
  });
});
