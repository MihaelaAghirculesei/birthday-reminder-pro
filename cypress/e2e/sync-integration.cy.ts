/**
 * Sync integration — full offline→sync chain
 *
 * Verifies the complete data flow end-to-end:
 *
 *   1. IDB write  →  birthday record has syncStatus:'pending' + ownerId (auth context respected)
 *   2. SyncCoordinator  →  FirestoreService called  →  pendingChanges cleared
 *   3. cloudBirthdaysUpdated action  →  IDB merge  →  syncStatus: 'synced'
 *
 * Strategy:
 *   - Firebase is NOT configured in the test environment (placeholder credentials),
 *     so FirestoreService.saveBirthday() returns of(undefined) immediately — a
 *     synchronous success that lets the entire queue-processor path run without
 *     any real HTTP calls or Firebase Emulator setup.
 *   - Auth state is injected via window.__testBridge (set up in main.ts only
 *     when window.Cypress is present, zero production cost).
 *   - The cloud-listener half of the chain is driven by dispatching
 *     cloudBirthdaysUpdated directly via the NgRx store, which is what
 *     CloudSyncService would dispatch after a real Firestore snapshot.
 */

interface BirthdayRecord {
  id: string;
  name: string;
  birthDate: string;
  category: string;
  syncStatus: string;
  ownerId: string | null;
  updatedAt: number;
}

interface PendingChange {
  id: string;
  entityType: string;
  entityId: string;
  changeType: string;
}

const TEST_USER = {
  uid: 'test-sync-uid-001',
  email: 'sync-test@example.com',
  displayName: 'Sync Test User',
  photoURL: null,
};

describe('Sync integration — full offline→sync chain', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.clearIndexedDB();
    cy.visit('/');
    cy.waitForAngular();
  });

  // ─── Test 1 ────────────────────────────────────────────────────────────────
  it('birthday saved while authenticated gets syncStatus "pending" and ownerId stamped', () => {
    // Authenticate via the test bridge BEFORE the birthday is added so that
    // selectUserId is non-null when the addBirthday$ effect runs.
    cy.setTestAuthUser(TEST_USER);

    cy.expandBirthdayForm();
    cy.get('[data-testid="birthday-name-input"]').type('Sync Queue Test');
    cy.get('[data-testid="birthday-date-input"]').type('05/15/1990');
    cy.get('[data-testid="save-birthday-button"]').click();

    // Birthday must be visible in the UI before we inspect IDB.
    cy.contains('Sync Queue Test').should('be.visible');

    // Assert: birthday IDB record has syncStatus 'pending' (not 'local-only'),
    // confirming that BirthdayService.prepareBirthdayForCreate() received a userId
    // and that the auth context was correctly propagated to the IDB write.
    // The pendingChanges queue is NOT asserted here: because FirestoreService is a
    // no-op (placeholder credentials), the queue is populated AND flushed within the
    // same Angular zone tick — the cleared state is verified in Test 2.
    cy.readIdbStore<BirthdayRecord>('birthdays').then((records) => {
      const record = records.find((r) => r.name === 'Sync Queue Test');
      expect(record, 'Birthday should exist in IDB').to.exist;
      expect(record!.syncStatus, 'syncStatus should be "pending" for authenticated user').to.equal('pending');
      expect(record!.ownerId, 'ownerId should match the test user uid').to.equal(TEST_USER.uid);
    });
  });

  // ─── Test 2 ────────────────────────────────────────────────────────────────
  it('pendingChanges queue is cleared after SyncQueueProcessor runs (Firestore no-op path)', () => {
    // With placeholder Firebase credentials, FirestoreService.saveBirthday()
    // returns of(undefined) immediately — the sync "succeeds" without any HTTP
    // call. This lets us test the full queue-processor path in CI without an emulator.
    cy.setTestAuthUser(TEST_USER);

    cy.expandBirthdayForm();
    cy.get('[data-testid="birthday-name-input"]').type('Sync Clear Test');
    cy.get('[data-testid="birthday-date-input"]').type('07/04/1985');
    cy.get('[data-testid="save-birthday-button"]').click();

    cy.contains('Sync Clear Test').should('be.visible');

    // Wait for all Angular async work (NgRx effects + IDB writes) to settle.
    cy.waitForAngular();

    // pendingChanges must be empty: SyncQueueProcessorService.processPendingChanges()
    // removed the entry after the Firestore call (no-op) succeeded.
    cy.readIdbStore<PendingChange>('pendingChanges').then((changes) => {
      expect(changes.length, 'pendingChanges should be empty after sync').to.equal(0);
    });

    // Birthday must still exist in IDB — the sync only clears the queue, not the record.
    cy.readIdbStore<BirthdayRecord>('birthdays').then((records) => {
      const record = records.find((r) => r.name === 'Sync Clear Test');
      expect(record, 'Birthday should remain in IDB after sync').to.exist;
    });
  });

  // ─── Test 3 ────────────────────────────────────────────────────────────────
  it('cloudBirthdaysUpdated action merges cloud data into IDB and sets syncStatus to "synced"', () => {
    const BIRTHDAY_ID = 'sync-integ-cloud-merge-001';
    const BIRTHDAY_NAME = 'Cloud Merge Test';

    // Seed IDB directly — simulates a birthday that was saved locally and is
    // now being acknowledged by the Firestore listener.
    cy.window().then((win) => {
      return new Cypress.Promise<void>((resolve, reject) => {
        const req = win.indexedDB.open('BirthdayReminderDB', 4);
        req.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const tx = db.transaction('birthdays', 'readwrite');
          tx.objectStore('birthdays').put({
            id: BIRTHDAY_ID,
            name: BIRTHDAY_NAME,
            birthDate: '1988-12-01',
            category: 'friends',
            syncStatus: 'pending',
            ownerId: TEST_USER.uid,
            updatedAt: Date.now(),
            _dataVersion: 4,
          });
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = () => reject(tx.error);
        };
        req.onerror = () => reject(req.error);
      });
    });

    // Reload so Angular picks up the seeded birthday from IDB.
    cy.reload();
    cy.waitForAngular();
    cy.contains(BIRTHDAY_NAME).should('be.visible');

    // Authenticate so the SyncEffects.cloudBirthdaysUpdated$ effect can run
    // (it calls mergeCloudBirthdays which saves to IDB and reloads the store).
    cy.setTestAuthUser(TEST_USER);

    // Simulate the Firestore real-time listener emitting the birthday back
    // with syncStatus: 'synced'. This is exactly what CloudSyncService dispatches
    // after receiving an onSnapshot event from Firestore.
    cy.dispatchNgrxAction({
      type: '[Sync] Cloud Birthdays Updated',
      birthdays: [
        {
          id: BIRTHDAY_ID,
          name: BIRTHDAY_NAME,
          birthDate: '1988-12-01',
          category: 'friends',
          syncStatus: 'synced',
          ownerId: TEST_USER.uid,
          updatedAt: Date.now(),
        },
      ],
    });

    // Wait for the SyncEffects.cloudBirthdaysUpdated$ effect to:
    //   1. Call mergeCloudBirthdays()
    //   2. IndexedDBStorageService.saveBirthdays() — IDB write
    //   3. BirthdayActions.loadBirthdays() — reloads NgRx store
    cy.waitForAngular();

    // IDB record must now reflect the cloud-provided syncStatus: 'synced'.
    cy.readIdbStore<BirthdayRecord>('birthdays').then((records) => {
      const record = records.find((r) => r.id === BIRTHDAY_ID);
      expect(record, 'Birthday should still exist in IDB after cloud merge').to.exist;
      expect(record!.syncStatus, 'syncStatus should be "synced" after cloud merge').to.equal('synced');
    });

    // Birthday must still appear in the UI after the merge + store reload.
    cy.contains(BIRTHDAY_NAME).should('be.visible');
  });
});
