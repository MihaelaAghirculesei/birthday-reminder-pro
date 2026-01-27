declare namespace Cypress {
  interface Chainable {
    clearIndexedDB(): Chainable<void>;
  }
}

Cypress.Commands.add('clearIndexedDB', () => {
  cy.window().then((win) => {
    // Check if databases() is supported (not available in all browsers)
    if (typeof win.indexedDB.databases === 'function') {
      win.indexedDB.databases().then((databases) => {
        databases.forEach((db) => {
          if (db.name) {
            win.indexedDB.deleteDatabase(db.name);
          }
        });
      });
    } else {
      // Fallback: delete known database names used by the app
      const knownDatabases = ['birthday-reminder-db', 'ngrx-store'];
      knownDatabases.forEach((dbName) => {
        win.indexedDB.deleteDatabase(dbName);
      });
    }
  });
});
