describe('Notifications', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.clearIndexedDB();
    cy.visit('/');
    cy.waitForAngular();
  });

  it('should display notification permission banner if supported', () => {
    cy.get('[data-testid="show-demo-button"]').click();
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
    cy.get('[data-testid="show-demo-button"]').click();
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
    cy.get('[data-testid="show-demo-button"]').click();
    cy.get('.notification-success', { timeout: 15000 })
      .should('exist')
      .and('contain.text', 'Imported');
  });

  it('network status shows Online by default', () => {
    cy.get('app-network-status').should('contain.text', 'Online');
  });

  it('network status shows Offline after offline event', () => {
    cy.window().then((win) => win.dispatchEvent(new Event('offline')));
    cy.get('app-network-status', { timeout: 5000 }).should('contain.text', 'Offline');
    // Restore online
    cy.window().then((win) => win.dispatchEvent(new Event('online')));
  });

  it('should close notification manually', () => {
    cy.get('[data-testid="show-demo-button"]').click();
    // Capture the close button before the 3s auto-dismiss fires
    cy.get('[data-testid="close-notification"]', { timeout: 10000 }).first().click({ force: true });
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(500); // Wait for exit animation to complete
    cy.get('.notification').should('not.exist');
  });
});
