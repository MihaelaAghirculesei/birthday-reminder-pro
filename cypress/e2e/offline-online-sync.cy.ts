/**
 * Offline → Online Sync Flow (E2E)
 *
 * Tests the most critical user journey: adding a birthday while offline, then
 * returning online and verifying the app correctly detects the transition.
 *
 * Scope
 * -----
 * These tests cover what is observable in the browser WITHOUT Firebase
 * authentication:
 *   - Offline writes land in IndexedDB immediately (offline-first contract).
 *   - NetworkService correctly detects offline/online transitions via native
 *     window events and a `/favicon.ico` health check.
 *   - The NetworkStatusComponent in the header reflects the current state.
 *   - Data is fully preserved across the offline → online cycle.
 *
 * What is NOT tested here (covered by unit tests instead)
 * -------------------------------------------------------
 *   - The `pendingChanges` IDB queue: only populated when the user IS
 *     authenticated. birthday-crud.effects.ts skips queueChange() when
 *     userId is null. → covered in sync-queue-processor.service.spec.ts.
 *   - pushPendingChanges dispatch on online-recovery: requires auth.
 *     → covered in sync.effects.spec.ts (onlineStatusChanged$ suite).
 *
 * Strategy
 * --------
 * - Block Firebase endpoints via cy.intercept so no accidental cloud calls
 *   pollute the tests.
 * - Fire native `offline` / `online` window events to drive NetworkService.
 * - The health check on 'online' fetches `/favicon.ico`; the dev/CI server
 *   serves it, so the check succeeds and the service emits `true`.
 */

describe('Offline → Online sync flow', () => {
  const DB_NAME = 'BirthdayReminderDB';
  const DB_VERSION = 4;

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.clearIndexedDB();

    // Prevent any Firebase calls from reaching the network
    cy.intercept({ hostname: /firestore\.googleapis\.com/ }, { forceNetworkError: true });
    cy.intercept({ hostname: /identitytoolkit\.googleapis\.com/ }, { forceNetworkError: true });
    cy.intercept({ hostname: /securetoken\.googleapis\.com/ }, { forceNetworkError: true });

    cy.visit('/');
    cy.waitForAngular();
  });

  // ---------------------------------------------------------------------------
  // Helper: read all records from a named IDB object store
  // ---------------------------------------------------------------------------
  function readIDBStore<T>(win: Window, storeName: string): Cypress.Chainable<T[]> {
    return cy.wrap(
      new Cypress.Promise<T[]>((resolve, reject) => {
        const req = (win as Window & { indexedDB: IDBFactory }).indexedDB.open(DB_NAME, DB_VERSION);
        req.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const tx = db.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);
          const getAll = store.getAll();
          getAll.onsuccess = () => { db.close(); resolve(getAll.result as T[]); };
          getAll.onerror = () => { db.close(); reject(getAll.error); };
        };
        req.onerror = () => reject(req.error);
      })
    );
  }

  // ---------------------------------------------------------------------------
  it('birthday added while offline is immediately visible in the UI', () => {
    cy.window().then((win) => win.dispatchEvent(new Event('offline')));

    cy.expandBirthdayForm();
    cy.get('[data-testid="birthday-name-input"]').type('Offline Birthday User');
    cy.get('[data-testid="birthday-date-input"]').type('05/10/1993');
    cy.get('[data-testid="save-birthday-button"]').click();

    cy.contains('Offline Birthday User').should('be.visible');
  });

  // ---------------------------------------------------------------------------
  it('birthday added while offline is written to the birthdays IDB store immediately', () => {
    cy.window().then((win) => win.dispatchEvent(new Event('offline')));

    cy.expandBirthdayForm();
    cy.get('[data-testid="birthday-name-input"]').type('IDB Offline User');
    cy.get('[data-testid="birthday-date-input"]').type('08/22/1988');
    cy.get('[data-testid="save-birthday-button"]').click();
    cy.contains('IDB Offline User').should('be.visible');

    cy.window().then((win) =>
      readIDBStore<{ name: string }>(win, 'birthdays').then((records) => {
        const found = records.find((r) => r.name === 'IDB Offline User');
        expect(found, '"IDB Offline User" should exist in the birthdays store immediately after offline save').to.exist;
      })
    );
  });

  // ---------------------------------------------------------------------------
  it('NetworkStatusComponent shows "Offline" after the offline event fires', () => {
    cy.window().then((win) => win.dispatchEvent(new Event('offline')));

    // The NetworkStatusComponent uses the NetworkService.online$ observable
    // and renders "Offline" text + applies the .offline CSS class
    cy.get('app-network-status').should('contain.text', 'Offline');
    cy.get('app-network-status .network-status').should('have.class', 'offline');
  });

  // ---------------------------------------------------------------------------
  it('NetworkStatusComponent transitions from "Offline" to "Online" after the online event and health check', () => {
    cy.window().then((win) => win.dispatchEvent(new Event('offline')));
    cy.get('app-network-status').should('contain.text', 'Offline');

    // Fire the native online event; NetworkService performs fetch('/favicon.ico').
    // The dev/CI server serves it, so the health check passes and the service
    // emits true → SyncCoordinator dispatches setOnlineStatus({ isOnline: true }).
    cy.window().then((win) => win.dispatchEvent(new Event('online')));

    cy.get('app-network-status', { timeout: 8000 }).should('contain.text', 'Online');
    cy.get('app-network-status .network-status').should('not.have.class', 'offline');
  });

  // ---------------------------------------------------------------------------
  it('data added while offline survives a page reload', () => {
    cy.window().then((win) => win.dispatchEvent(new Event('offline')));

    cy.expandBirthdayForm();
    cy.get('[data-testid="birthday-name-input"]').type('Reload Survivor Offline');
    cy.get('[data-testid="birthday-date-input"]').type('03/18/1991');
    cy.get('[data-testid="save-birthday-button"]').click();
    cy.contains('Reload Survivor Offline').should('be.visible');

    cy.reload();
    cy.waitForAngular();

    cy.contains('Reload Survivor Offline').should('be.visible');
  });

  // ---------------------------------------------------------------------------
  it('birthday added while offline is preserved in both UI and IDB after the full offline → online cycle', () => {
    // Simulate going offline
    cy.window().then((win) => win.dispatchEvent(new Event('offline')));
    cy.get('app-network-status').should('contain.text', 'Offline');

    cy.expandBirthdayForm();
    cy.get('[data-testid="birthday-name-input"]').type('Full Cycle User');
    cy.get('[data-testid="birthday-date-input"]').type('02/14/1992');
    cy.get('[data-testid="save-birthday-button"]').click();
    cy.contains('Full Cycle User').should('be.visible');

    // Verify IDB write happened while offline
    cy.window().then((win) =>
      readIDBStore<{ name: string }>(win, 'birthdays').then((records) => {
        const found = records.find((r) => r.name === 'Full Cycle User');
        expect(found, 'record should be in IDB before coming back online').to.exist;
      })
    );

    // Come back online — health check will pass (favicon.ico served by the app)
    cy.window().then((win) => win.dispatchEvent(new Event('online')));
    cy.get('app-network-status', { timeout: 8000 }).should('contain.text', 'Online');

    // Local data must be untouched by the online transition
    cy.window().then((win) =>
      readIDBStore<{ name: string }>(win, 'birthdays').then((records) => {
        const found = records.find((r) => r.name === 'Full Cycle User');
        expect(found, 'record must still be in IDB after coming back online').to.exist;
      })
    );

    // And the UI must still show it
    cy.contains('Full Cycle User').should('be.visible');
  });
});
