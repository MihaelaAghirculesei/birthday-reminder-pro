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

  it('should show success notification after loading demo data', () => {
    cy.contains('Show Demo').click();
    cy.get('.notification-success', { timeout: 15000 })
      .should('exist')
      .and('contain.text', 'test birthdays loaded successfully!');
  });

  it('should close notification manually', () => {
    cy.contains('Show Demo').click();
    cy.get('[data-testid="close-notification"]', { timeout: 10000 }).first().click({ force: true });
    cy.get('.notification').should('not.exist');
  });
});
