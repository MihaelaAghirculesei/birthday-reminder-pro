// ---------------------------------------------------------------------------
// Visual regression seed fixture
// ---------------------------------------------------------------------------

interface VisualSeedBirthday {
  id: string;
  name: string;
  birthDate: string;
  category?: string;
  notes?: string;
  reminderDays?: number;
  email?: string;
  syncStatus: string;
  updatedAt: number;
}

declare namespace Cypress {
  interface Chainable {
    clearIndexedDB(): Chainable<void>;
    waitForAngular(): Chainable<void>;
    expandBirthdayForm(): Chainable<void>;

    /**
     * Writes a deterministic set of 4 birthdays directly into IndexedDB,
     * then reloads the page so Angular picks them up on boot.
     * Call AFTER cy.waitForAngular() so the DB is already open.
     */
    seedVisualTestData(): Chainable<void>;

    /**
     * Applies the dark-theme class instantly (no transition) and sets
     * localStorage so the theme persists after a reload.
     */
    enableDarkMode(): Chainable<void>;

    /** Removes the dark-theme class and clears the localStorage key. */
    disableDarkMode(): Chainable<void>;

    /**
     * Injects a <style> tag that zeroes all animation/transition durations,
     * Also useful before taking screenshots to avoid mid-animation captures.
     */
    disableAnimations(): Chainable<void>;

    /**
     * Disables animations, drains the Angular zone, then takes a local screenshot.
     * Screenshots are saved to cypress/screenshots/ (gitignored).
     */
    visualSnapshot(name: string): Chainable<void>;
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
  // Check that Angular Material components are fully initialized (use add-birthday button as universal hydration marker)
  cy.get('[data-testid="add-birthday-button"]', { timeout: 10000 }).should('exist');
  // Allow time for Angular to attach all event handlers after DOM is ready
  // eslint-disable-next-line cypress/no-unnecessary-waiting
  cy.wait(1000);
});

Cypress.Commands.add('expandBirthdayForm', () => {
  // Retry clicking until the form actually expands (SSR hydration safe)
  const maxRetries = 5;

  function attemptExpand(attempt: number): void {
    cy.get('body').then(($body) => {
      // Check the element is truly visible and not mid-animation
      const $input = $body.find('[data-testid="birthday-name-input"]');
      if ($input.length > 0 && $input.is(':visible') && $input.closest('[style]').css('height') !== '0px') {
        return; // Form already expanded and stable
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

// ---------------------------------------------------------------------------
// Visual regression helpers
// ---------------------------------------------------------------------------

/**
 * Fixed point-in-time used across all visual tests.
 * Freeze the JS clock to this value so "days until birthday" never drifts.
 * Date: 2026-03-24 12:00 UTC
 */
const VISUAL_FIXED_TIMESTAMP = new Date('2026-03-24T12:00:00.000Z').getTime();

/**
 * Deterministic birthday fixtures for visual tests.
 * Relative to VISUAL_FIXED_TIMESTAMP (2026-03-24):
 *   - David Chen    → 0 days  (birthday TODAY)
 *   - Alice Johnson → 3 days
 *   - Carol Williams→ 83 days
 *   - Bob Martinez  → 276 days
 */
const VISUAL_SEED_BIRTHDAYS: VisualSeedBirthday[] = [
  {
    id: 'vis-001',
    name: 'Alice Johnson',
    birthDate: '1990-03-27',
    category: 'family',
    notes: 'Bring flowers',
    reminderDays: 7,
    syncStatus: 'local-only',
    updatedAt: VISUAL_FIXED_TIMESTAMP,
  },
  {
    id: 'vis-002',
    name: 'Bob Martinez',
    birthDate: '1985-12-25',
    category: 'friends',
    reminderDays: 3,
    syncStatus: 'local-only',
    updatedAt: VISUAL_FIXED_TIMESTAMP,
  },
  {
    id: 'vis-003',
    name: 'Carol Williams',
    birthDate: '1992-06-15',
    category: 'colleagues',
    email: 'carol@company.com',
    reminderDays: 14,
    syncStatus: 'local-only',
    updatedAt: VISUAL_FIXED_TIMESTAMP,
  },
  {
    id: 'vis-004',
    name: 'David Chen',
    birthDate: '1988-03-24',
    category: 'friends',
    notes: 'Pizza party at 8pm',
    reminderDays: 1,
    syncStatus: 'local-only',
    updatedAt: VISUAL_FIXED_TIMESTAMP,
  },
];

Cypress.Commands.add('seedVisualTestData', () => {
  // Write directly into IndexedDB (DB is already open — Angular initialized it).
  // Then reload so the NgRx effects re-read the seeded rows on boot.
  cy.window().then((win) => {
    return new Cypress.Promise<void>((resolve, reject) => {
      // Version must match IndexedDBConnectionService.dbVersion (currently 4)
      const req = win.indexedDB.open('BirthdayReminderDB', 4);

      req.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const tx = db.transaction('birthdays', 'readwrite');
        const store = tx.objectStore('birthdays');

        VISUAL_SEED_BIRTHDAYS.forEach((birthday) => store.put(birthday));

        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };

      req.onerror = () => reject(req.error);
    });
  });

  // Reload so Angular reads the freshly seeded data during store initialization
  cy.reload();
  cy.waitForAngular();
});

Cypress.Commands.add('enableDarkMode', () => {
  cy.window().then((win) => {
    win.localStorage.setItem('birthday-app-dark-mode', 'true');
    win.document.body.classList.remove('theme-transitioning');
    win.document.body.classList.add('dark-theme');
  });
});

Cypress.Commands.add('disableDarkMode', () => {
  cy.window().then((win) => {
    win.localStorage.removeItem('birthday-app-dark-mode');
    win.document.body.classList.remove('dark-theme', 'theme-transitioning');
  });
});

Cypress.Commands.add('disableAnimations', () => {
  cy.document().then((doc) => {
    const existing = doc.getElementById('cy-no-animations');
    if (existing) return;

    const style = doc.createElement('style');
    style.id = 'cy-no-animations';
    style.innerHTML = [
      '*, *::before, *::after {',
      '  animation: none !important;',
      '  animation-duration: 0s !important;',
      '  animation-delay: 0s !important;',
      '  transition: none !important;',
      '  transition-duration: 0s !important;',
      '  transition-delay: 0s !important;',
      '}',
      // Angular Material dialogs start at opacity:0 and rely on CSS transitions
      // to reach opacity:1. With transitions disabled we must force full opacity.
      '.mat-mdc-dialog-inner-container,',
      '.mat-mdc-dialog-container,',
      '.cdk-overlay-pane {',
      '  opacity: 1 !important;',
      '  transform: none !important;',
      '}',
    ].join('\n');
    doc.head.appendChild(style);
  });
});

Cypress.Commands.add('visualSnapshot', (name: string) => {
  cy.disableAnimations();
  // Let the Angular zone drain and any pending micro-tasks settle
  // eslint-disable-next-line cypress/no-unnecessary-waiting
  cy.wait(200);
  cy.screenshot(name, { overwrite: true });
});
