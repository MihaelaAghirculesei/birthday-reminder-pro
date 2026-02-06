declare namespace Cypress {
  interface Chainable {
    clearIndexedDB(): Chainable<void>;
    waitForAngular(): Chainable<void>;
    expandBirthdayForm(): Chainable<void>;
  }
}

Cypress.Commands.add('clearIndexedDB', () => {
  cy.window().then((win) => {
    return new Cypress.Promise<void>((resolve) => {
      if (typeof win.indexedDB.databases === 'function') {
        win.indexedDB.databases().then((databases) => {
          const deletePromises = databases
            .filter((db) => db.name)
            .map((db) => {
              return new Promise<void>((res) => {
                const req = win.indexedDB.deleteDatabase(db.name!);
                req.onsuccess = () => res();
                req.onerror = () => res();
                req.onblocked = () => res();
              });
            });
          Promise.all(deletePromises).then(() => resolve());
        });
      } else {
        const knownDatabases = ['BirthdayReminderDB'];
        const deletePromises = knownDatabases.map((dbName) => {
          return new Promise<void>((res) => {
            const req = win.indexedDB.deleteDatabase(dbName);
            req.onsuccess = () => res();
            req.onerror = () => res();
            req.onblocked = () => res();
          });
        });
        Promise.all(deletePromises).then(() => resolve());
      }
    });
  });
});

Cypress.Commands.add('waitForAngular', () => {
  cy.get('.app-header', { timeout: 10000 }).should('be.visible');
  // Wait for Angular SSR hydration to complete
  // The SSR pre-renders HTML but event handlers aren't attached until hydration finishes
  // Check that Angular Material components are fully initialized
  cy.get('mat-slide-toggle', { timeout: 10000 }).should('exist');
  // Allow time for Angular to attach all event handlers after DOM is ready
  // eslint-disable-next-line cypress/no-unnecessary-waiting
  cy.wait(1000);
});

Cypress.Commands.add('expandBirthdayForm', () => {
  // Retry clicking until the form actually expands (SSR hydration safe)
  const maxRetries = 5;

  function attemptExpand(attempt: number): void {
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="birthday-name-input"]:visible').length > 0) {
        return; // Form already expanded
      }

      cy.get('[data-testid="add-birthday-button"]').click({ force: true });

      if (attempt < maxRetries) {
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(500);
        cy.get('body').then(($b) => {
          if ($b.find('[data-testid="birthday-name-input"]:visible').length === 0) {
            attemptExpand(attempt + 1);
          }
        });
      }
    });
  }

  attemptExpand(1);
  cy.get('[data-testid="birthday-name-input"]', { timeout: 10000 }).should('be.visible');
});
