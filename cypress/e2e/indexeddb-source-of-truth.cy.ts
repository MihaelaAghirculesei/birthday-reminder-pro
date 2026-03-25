/**
 * IndexedDB as source of truth
 *
 * Verifies that every write goes to IndexedDB IMMEDIATELY after save,
 * before any cloud sync, page reload, or UI interaction.
 *
 * Strategy: add a birthday via the UI, then read the raw IndexedDB store
 * directly (without reloading) and assert the record is there with the
 * correct data. This guarantees the app honours the offline-first contract.
 */

describe('IndexedDB — source of truth', () => {
  const DB_NAME = 'BirthdayReminderDB';
  const DB_VERSION = 4;

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.clearIndexedDB();
    cy.visit('/');
    cy.waitForAngular();
  });

  it('writes the record to IndexedDB immediately after save (before reload)', () => {
    const name = 'IndexedDB Test User';
    const rawDate = '03/15/1992';

    cy.expandBirthdayForm();
    cy.get('[data-testid="birthday-name-input"]').type(name);
    cy.get('[data-testid="birthday-date-input"]').type(rawDate);
    cy.get('[data-testid="save-birthday-button"]').click();

    // Confirm the card appeared in the UI
    cy.contains(name).should('be.visible');

    // NOW — without reloading — read the raw IndexedDB store and verify the record
    cy.window().then((win) => {
      return new Cypress.Promise<void>((resolve, reject) => {
        const req = win.indexedDB.open(DB_NAME, DB_VERSION);

        req.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const tx = db.transaction('birthdays', 'readonly');
          const store = tx.objectStore('birthdays');
          const getAll = store.getAll();

          getAll.onsuccess = () => {
            db.close();
            const records: Array<{ name: string }> = getAll.result;
            const found = records.find((r) => r.name === name);
            expect(found, `Record "${name}" should exist in IndexedDB immediately after save`).to.exist;
            resolve();
          };
          getAll.onerror = () => reject(getAll.error);
        };
        req.onerror = () => reject(req.error);
      });
    });
  });

  it('persists data across reload (IndexedDB survives page refresh)', () => {
    const name = 'Reload Survivor';

    cy.expandBirthdayForm();
    cy.get('[data-testid="birthday-name-input"]').type(name);
    cy.get('[data-testid="birthday-date-input"]').type('07/04/1985');
    cy.get('[data-testid="save-birthday-button"]').click();
    cy.contains(name).should('be.visible');

    cy.reload();
    cy.waitForAngular();

    cy.contains(name).should('be.visible');
  });

  it('IndexedDB contains the record before any sync (syncStatus is local-only)', () => {
    const name = 'Sync Status Check';

    cy.expandBirthdayForm();
    cy.get('[data-testid="birthday-name-input"]').type(name);
    cy.get('[data-testid="birthday-date-input"]').type('11/11/1991');
    cy.get('[data-testid="save-birthday-button"]').click();
    cy.contains(name).should('be.visible');

    cy.window().then((win) => {
      return new Cypress.Promise<void>((resolve, reject) => {
        const req = win.indexedDB.open(DB_NAME, DB_VERSION);
        req.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const tx = db.transaction('birthdays', 'readonly');
          const store = tx.objectStore('birthdays');
          const getAll = store.getAll();

          getAll.onsuccess = () => {
            db.close();
            const records: Array<{ name: string; syncStatus: string }> = getAll.result;
            const record = records.find((r) => r.name === name);
            expect(record, `Record "${name}" should exist`).to.exist;
            // Without Firebase sign-in the record stays local-only
            expect(record!.syncStatus).to.equal('local-only');
            resolve();
          };
          getAll.onerror = () => reject(getAll.error);
        };
        req.onerror = () => reject(req.error);
      });
    });
  });
});
