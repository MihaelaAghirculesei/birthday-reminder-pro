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

  it('should search birthdays by name', () => {
    cy.contains('Alice Johnson').should('exist');
    cy.contains('Bob Smith').should('exist');
    cy.contains('Carlo Bruns').should('exist');

    cy.get('[data-testid="search-input"]')
      .should('be.visible')
      .type('Alice', { force: true });

    cy.contains('Alice Johnson').should('exist');
    cy.contains('Bob Smith').should('not.exist');
    cy.contains('Carlo Bruns').should('not.exist');
  });

  it('should clear search and show all birthdays', () => {
    cy.get('[data-testid="search-input"]')
      .should('exist')
      .type('Alice', { force: true });
    cy.contains('Bob Smith').should('not.exist');

    cy.get('[data-testid="search-input"]')
      .should('exist')
      .clear({ force: true });

    cy.contains('Alice Johnson').should('exist');
    cy.contains('Bob Smith').should('exist');
    cy.contains('Carlo Bruns').should('exist');
  });

  it('should show no results message for non-existent search', () => {
    cy.get('[data-testid="search-input"]')
      .should('be.visible')
      .type('NonExistent', { force: true });

    // Wait for NgRx pipeline (dispatch → selector → filteredBirthdays → ngOnChanges)
    // before asserting on the no-results state.
    cy.get('app-birthday-item', { timeout: 10000 }).should('not.exist');

    cy.get('[data-testid="no-results-message"]', { timeout: 10000 })
      .should('be.visible')
      .and('contain.text', 'No birthdays found');
  });

  it('should be case insensitive', () => {
    cy.get('[data-testid="search-input"]')
      .should('exist')
      .type('alice', { force: true });
    cy.contains('Alice Johnson').should('be.visible');

    cy.get('[data-testid="search-input"]')
      .should('exist')
      .clear({ force: true });
    cy.get('[data-testid="search-input"]')
      .should('exist')
      .type('ALICE', { force: true });
    cy.contains('Alice Johnson').should('be.visible');
  });

  it('should match second word (last name) prefix', () => {
    cy.get('[data-testid="search-input"]')
      .should('exist')
      .type('John', { force: true });

    // 'Johnson' starts with 'John' → Alice Johnson should match
    cy.contains('Alice Johnson').should('exist');
    cy.contains('Bob Smith').should('not.exist');
  });

  it('should NOT match mid-word substrings', () => {
    cy.get('[data-testid="search-input"]')
      .should('exist')
      .type('mith', { force: true });

    // 'smith' does not START with 'mith' — should not match Bob Smith
    cy.contains('Bob Smith').should('not.exist');
  });

  it('should search by multi-character prefix', () => {
    cy.get('[data-testid="search-input"]')
      .should('exist')
      .type('Car', { force: true });

    cy.contains('Carlo Bruns').should('exist');
    cy.contains('Alice Johnson').should('not.exist');
    cy.contains('Bob Smith').should('not.exist');
  });

  it('should handle rapid successive searches', () => {
    cy.get('[data-testid="search-input"]')
      .should('exist')
      .type('Al', { force: true });
    cy.contains('Alice Johnson').should('exist');

    cy.get('[data-testid="search-input"]')
      .should('exist')
      .clear({ force: true })
      .type('Bo', { force: true });
    cy.contains('Bob Smith').should('exist');
    cy.contains('Alice Johnson').should('not.exist');
  });
});
