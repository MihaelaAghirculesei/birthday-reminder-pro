declare namespace Cypress {
  interface Chainable {
    clearIndexedDB(): Chainable<void>;
  }
}

Cypress.Commands.add('clearIndexedDB', () => {
  cy.window().then((win) => {
    win.indexedDB.databases().then((databases) => {
      databases.forEach((db) => {
        if (db.name) {
          win.indexedDB.deleteDatabase(db.name);
        }
      });
    });
  });
});
