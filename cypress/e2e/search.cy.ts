describe('Search Functionality', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.clearIndexedDB();
    cy.visit('/');
    cy.waitForAngular();

    const birthdays = [
      { name: 'Alice Johnson', date: '01/15/1990' },
      { name: 'Bob Smith', date: '05/20/1985' },
      { name: 'Carlo Bruns', date: '09/10/1992' }
    ];

    birthdays.forEach((birthday) => {
      // Wait for form to be fully removed from DOM before expanding again
      cy.get('[data-testid="birthday-name-input"]', { timeout: 5000 }).should('not.exist');
      cy.expandBirthdayForm();

      cy.get('[data-testid="birthday-name-input"]', { timeout: 10000 })
        .should('be.visible')
        .clear()
        .type(birthday.name);

      cy.get('[data-testid="birthday-date-input"]', { timeout: 10000 })
        .should('be.visible')
        .clear()
        .type(birthday.date);

      cy.get('[data-testid="save-birthday-button"]')
        .should('be.visible')
        .click();
    });

    cy.get('.dashboard-container', { timeout: 15000 }).should('exist');
    cy.get('[data-testid="search-input"]', { timeout: 15000 }).should('be.visible');
  });

  // All birthday-name assertions are scoped to [data-testid="birthday-list-card"]
  // (the always-present wrapper card) instead of the global document.
  //
  // WHY: the dashboard stats card shows the "Next Birthday" name (e.g. "Carlo Bruns")
  // from all birthdays — not the filtered list. A global cy.contains('Carlo Bruns')
  // would find that stats text and make should('not.exist') fail even after Carlo is
  // correctly removed from the birthday list by the search filter.
  //
  // [data-testid="birthday-list-card"] is unconditionally rendered (unlike the virtual
  // scroll viewport [data-testid="birthday-list"], which disappears when the filtered
  // list is empty), so it works for both zero-result and non-zero-result searches.

  it('should search birthdays by name', () => {
    cy.get('[data-testid="birthday-list-card"]').contains('Alice Johnson').should('exist');
    cy.get('[data-testid="birthday-list-card"]').contains('Bob Smith').should('exist');
    cy.get('[data-testid="birthday-list-card"]').contains('Carlo Bruns').should('exist');

    cy.get('[data-testid="search-input"]')
      .should('be.visible')
      .type('Alice', { force: true });

    cy.get('[data-testid="birthday-list-card"]').contains('Alice Johnson').should('exist');
    cy.get('[data-testid="birthday-list-card"]').contains('Bob Smith').should('not.exist');
    cy.get('[data-testid="birthday-list-card"]').contains('Carlo Bruns').should('not.exist');
  });

  it('should clear search and show all birthdays', () => {
    cy.get('[data-testid="search-input"]')
      .should('exist')
      .type('Alice', { force: true });
    cy.get('[data-testid="birthday-list-card"]').contains('Bob Smith').should('not.exist');

    cy.get('[data-testid="search-input"]')
      .should('exist')
      .clear({ force: true });

    cy.get('[data-testid="birthday-list-card"]').contains('Alice Johnson').should('exist');
    cy.get('[data-testid="birthday-list-card"]').contains('Bob Smith').should('exist');
    cy.get('[data-testid="birthday-list-card"]').contains('Carlo Bruns').should('exist');
  });

  it('should show no results message for non-existent search', () => {
    cy.get('[data-testid="search-input"]')
      .should('be.visible')
      .type('NonExistent', { force: true });

    // 'NonExistent' matches zero birthdays, so the virtual scroll removes ALL
    // app-birthday-item elements from the DOM. Waiting for their absence is more
    // reliable than cy.waitForAngular() here: whenStable() resolves as soon as
    // zone tasks drain, but Angular's signal-based reactive pipeline may schedule
    // template re-renders on the next microtask flush — after whenStable() fires.
    // The DOM change (items gone → no-results-message rendered) is the concrete
    // indicator that the full NgRx → signal → CD → render cycle completed.
    cy.get('app-birthday-item', { timeout: 10000 }).should('not.exist');

    cy.get('[data-testid="no-results-message"]', { timeout: 10000 })
      .should('be.visible')
      .and('contain.text', 'No birthdays found');
  });

  it('should be case insensitive', () => {
    cy.get('[data-testid="search-input"]')
      .should('exist')
      .type('alice', { force: true });
    cy.get('[data-testid="birthday-list-card"]').contains('Alice Johnson').should('be.visible');

    cy.get('[data-testid="search-input"]')
      .should('exist')
      .clear({ force: true });
    cy.get('[data-testid="search-input"]')
      .should('exist')
      .type('ALICE', { force: true });
    cy.get('[data-testid="birthday-list-card"]').contains('Alice Johnson').should('be.visible');
  });

  it('should match second word (last name) prefix', () => {
    cy.get('[data-testid="search-input"]')
      .should('exist')
      .type('John', { force: true });

    // 'Johnson' starts with 'John' → Alice Johnson should match
    cy.get('[data-testid="birthday-list-card"]').contains('Alice Johnson').should('exist');
    cy.get('[data-testid="birthday-list-card"]').contains('Bob Smith').should('not.exist');
  });

  it('should NOT match mid-word substrings', () => {
    cy.get('[data-testid="search-input"]')
      .should('exist')
      .type('mith', { force: true });

    // 'smith' does not START with 'mith' — should not match Bob Smith
    cy.get('[data-testid="birthday-list-card"]').contains('Bob Smith').should('not.exist');
  });

  it('should search by multi-character prefix', () => {
    cy.get('[data-testid="search-input"]')
      .should('exist')
      .type('Car', { force: true });

    cy.get('[data-testid="birthday-list-card"]').contains('Carlo Bruns').should('exist');
    cy.get('[data-testid="birthday-list-card"]').contains('Alice Johnson').should('not.exist');
    cy.get('[data-testid="birthday-list-card"]').contains('Bob Smith').should('not.exist');
  });

  it('should handle rapid successive searches', () => {
    cy.get('[data-testid="search-input"]')
      .should('exist')
      .type('Al', { force: true });
    cy.get('[data-testid="birthday-list-card"]').contains('Alice Johnson').should('exist');

    cy.get('[data-testid="search-input"]')
      .should('exist')
      .clear({ force: true })
      .type('Bo', { force: true });
    cy.get('[data-testid="birthday-list-card"]').contains('Bob Smith').should('exist');
    cy.get('[data-testid="birthday-list-card"]').contains('Alice Johnson').should('not.exist');
  });
});
