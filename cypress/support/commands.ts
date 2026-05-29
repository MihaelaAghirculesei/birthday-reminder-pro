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

    /**
     * Waits for the nav strip to become visible (desktop viewport only).
     * Useful after viewport resizes or route changes.
     */
    waitForNavStrip(): Chainable<void>;

    /**
     * Patches window.IntersectionObserver BEFORE the page loads so that Angular
     * `@defer(on viewport)` blocks render immediately in headless/CI mode.
     *
     * MUST be called before cy.visit(). The stub fires isIntersecting:true
     * synchronously for every observed element, bypassing the real layout engine.
     *
     * Use only when the test needs to assert on fully-rendered deferred content
     * (e.g. app-birthday-chart). Do NOT use in tests that verify the deferred /
     * lazy-rendering behaviour itself.
     */
    mockDeferViewport(): Chainable<void>;
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
  cy.get('.app-header', { timeout: 15000 }).should('be.visible');
  cy.get('[data-testid="add-birthday-button"]', { timeout: 15000 }).should('exist');
  // Use Angular's testability API to wait for zone stability (which includes SSR
  // hydration completion). whenStable() fires immediately if already stable, so
  // this resolves in ~0–200 ms instead of always burning a fixed 1 s.
  cy.window().then((win) => {
    return new Cypress.Promise<void>((resolve) => {
      type NgTestability = { whenStable(done: () => void): void };
      const getAllTestabilities = (win as any).getAllAngularTestabilities as (() => NgTestability[]) | undefined;
      if (!getAllTestabilities) {
        // Testability API unavailable (e.g. production build): short fallback.
        setTimeout(resolve, 300);
        return;
      }
      const testabilities = getAllTestabilities();
      if (!testabilities.length) {
        setTimeout(resolve, 300);
        return;
      }
      let remaining = testabilities.length;
      testabilities.forEach((t) => t.whenStable(() => { if (--remaining === 0) resolve(); }));
    });
  });
});

Cypress.Commands.add('waitForNavStrip', () => {
  cy.get('.nav-strip', { timeout: 5000 }).should('be.visible');
});

Cypress.Commands.add('expandBirthdayForm', () => {
  // waitForAngular() guarantees Angular is hydrated before this runs.
  // The translateY animation takes 200 ms enter / 150 ms leave; Cypress retries
  // should('be.visible') every ~50 ms and passes quickly — no explicit wait needed.
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="birthday-name-input"]:visible').length === 0) {
      cy.get('[data-testid="add-birthday-button"]').click();
    }
  });
  cy.get('[data-testid="birthday-name-input"]', { timeout: 5000 }).should('be.visible');
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
    email: 'test@example.com',
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

/**
 * No-op stub kept for backward compatibility.
 *
 * IntersectionObserver is now stubbed globally in cypress/support/e2e.ts via
 * Cypress.on('window:before:load', …), which fires for EVERY page load
 * (cy.visit, cy.reload, nested reloads inside custom commands) in every test.
 *
 * The previous cy.on() approach placed here was scoped to the test chain and
 * did not reliably re-fire for cy.reload() called from within a nested custom
 * command (seedVisualTestData), leaving the chart placeholder visible in
 * headless mode. Moving the stub to Cypress.on() in e2e.ts fixed this.
 *
 * Tests that call cy.mockDeferViewport() do not need to be changed — the
 * global stub is already active before cy.visit() or cy.reload() runs.
 */
Cypress.Commands.add('mockDeferViewport', () => {
  // Global IO stub is active via Cypress.on() in e2e.ts — nothing to do here.
});

Cypress.Commands.add('visualSnapshot', (name: string) => {
  cy.disableAnimations();
  // eslint-disable-next-line cypress/no-unnecessary-waiting
  cy.wait(200);
  cy.screenshot(name, { overwrite: true });
});
