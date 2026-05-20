/**
 * Import / Export — end-to-end
 *
 * Verifies:
 * 1. Exporting JSON via the nav-strip Export dropdown triggers a success notification.
 * 2. Exporting CSV via the nav-strip Export dropdown triggers a success notification.
 * 3. Importing a JSON backup file adds birthdays to the store and the list.
 * 4. Importing a CSV file adds birthdays to the store and the list.
 * 5. Importing an invalid JSON file shows an error notification.
 *
 * Export strategy: seed data → open the "Export" dropdown in the nav strip →
 * click "Export JSON" / "Export CSV" → assert notification.
 *
 * Import strategy: target the hidden <input type="file"> inside
 * app-header-import-export directly via cy.selectFile({ force: true }).
 * This bypasses the native file-picker dialog restriction while still
 * firing the Angular (change) event handler.
 *
 * Note: the nav strip is only visible at viewport width > 1010 px.
 * Cypress default viewport (1280×720) satisfies this constraint.
 */

describe('Export — nav strip dropdown', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.clearIndexedDB();
    cy.visit('/');
    cy.waitForAngular();
    cy.seedVisualTestData(); // seeds 4 birthdays, calls cy.reload() internally
    cy.disableAnimations(); // must come after seedVisualTestData reload
  });

  it('exports JSON and shows "Exported to JSON" notification', () => {
    // Confirm the seeded birthdays are rendered before exporting.
    // seedVisualTestData() triggers an IDB reload; this assertion ensures the
    // NgRx store has finished its async IDB read before the export runs.
    cy.get('app-birthday-item', { timeout: 8000 }).should('exist');
    cy.contains('.nav-strip-item', 'Export').click();
    cy.contains('Export JSON').click();
    // Angular's @slideIn animation starts notifications at opacity:0. Cypress 15's
    // cy.contains() skips opacity:0 elements, so we assert on the container's
    // textContent instead — it reflects the notification even before the animation
    // raises opacity above 0.
    cy.get('.notification-container', { timeout: 8000 }).should('contain.text', 'Exported to JSON');
  });

  it('exports CSV and shows "Exported to CSV" notification', () => {
    cy.get('app-birthday-item', { timeout: 8000 }).should('exist');
    cy.contains('.nav-strip-item', 'Export').click();
    cy.contains('Export CSV').click();
    cy.get('.notification-container', { timeout: 8000 }).should('contain.text', 'Exported to CSV');
  });
});

describe('Import — JSON backup', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.clearIndexedDB();
    cy.visit('/');
    cy.waitForAngular();
  });

  it('imports 2 birthdays from a JSON backup and shows them in the list', () => {
    // Two app-header-import-export components exist (mobile + nav-strip); use .first()
    // so cy.selectFile() has exactly one subject.
    cy.get('app-header-import-export input[accept=".json"]').first()
      .selectFile('cypress/fixtures/birthday-backup.json', { force: true });

    cy.get('.notification-container', { timeout: 8000 }).should('contain.text', 'Imported 2 birthdays');
    cy.contains('Imported Birthday User').should('be.visible');
    cy.contains('Second Imported User').should('be.visible');
  });

  it('persists imported birthdays across a page reload', () => {
    cy.get('app-header-import-export input[accept=".json"]').first()
      .selectFile('cypress/fixtures/birthday-backup.json', { force: true });

    cy.contains('Imported Birthday User', { timeout: 8000 }).should('be.visible');

    cy.reload();
    cy.waitForAngular();

    cy.contains('Imported Birthday User').should('be.visible');
    cy.contains('Second Imported User').should('be.visible');
  });

  it('shows an error notification for an invalid JSON file', () => {
    cy.get('app-header-import-export input[accept=".json"]').first()
      .selectFile(
        {
          contents: Cypress.Buffer.from('not valid json at all'),
          fileName: 'invalid.json',
          mimeType: 'application/json',
        },
        { force: true }
      );

    cy.contains('Invalid backup file', { timeout: 5000 }).should('be.visible');
    cy.contains('Imported Birthday User').should('not.exist');
  });
});

describe('Import — CSV', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.clearIndexedDB();
    cy.visit('/');
    cy.waitForAngular();
  });

  it('imports 1 birthday from a CSV file and shows it in the list', () => {
    cy.get('app-header-import-export input[accept=".csv"]').first()
      .selectFile('cypress/fixtures/birthday-import.csv', { force: true });

    cy.get('.notification-container', { timeout: 8000 }).should('contain.text', 'Imported 1 birthdays');
    cy.contains('CSV Import User').should('be.visible');
  });
});
