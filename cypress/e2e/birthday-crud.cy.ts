describe('Birthday CRUD Operations', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.clearIndexedDB();
    cy.visit('/');
    cy.waitForAngular();
    // Disable all CSS transitions and Angular Material animations so dialogs
    // and the @expandCollapse form animation complete instantly.
    cy.disableAnimations();
  });

  it('should add a new birthday', () => {
    cy.expandBirthdayForm();

    cy.get('[data-testid="birthday-name-input"]').type('John Doe');
    // .blur() triggers Angular Material datepicker's final parse of the typed date.
    cy.get('[data-testid="birthday-date-input"]').type('05/15/1990').blur();
    cy.get('[data-testid="reminder-days-input"]').clear().type('7');

    cy.get('[data-testid="save-birthday-button"]').click();

    cy.contains('John Doe', { timeout: 10000 }).should('be.visible');
  });

  it('should edit an existing birthday', () => {
    cy.expandBirthdayForm();
    cy.get('[data-testid="birthday-name-input"]').type('Jane Smith');
    cy.get('[data-testid="birthday-date-input"]').type('12/25/1985').blur();
    cy.get('[data-testid="save-birthday-button"]').click();

    cy.contains('Jane Smith', { timeout: 10000 }).should('be.visible');

    cy.get('[data-testid="edit-birthday-button"]').first().click();

    // editBirthday() does a lazy import() before opening the dialog; 15 s covers
    // both the module-load round-trip and any remaining animation delay.
    cy.get('.dialog-container', { timeout: 15000 }).should('be.visible');
    cy.get('.dialog-container [data-testid="birthday-name-input"]').clear().type('Jane Doe');
    cy.get('.dialog-container input[type="email"]').type('jane@example.com');
    cy.get('.dialog-container [data-testid="save-birthday-button"]').click();

    cy.contains('Jane Doe', { timeout: 10000 }).should('be.visible');
    cy.contains('Jane Smith').should('not.exist');
  });

  it('should delete a birthday', () => {
    cy.expandBirthdayForm();
    cy.get('[data-testid="birthday-name-input"]').type('Test User');
    cy.get('[data-testid="birthday-date-input"]').type('01/01/2000').blur();
    cy.get('[data-testid="save-birthday-button"]').click();

    cy.contains('Test User', { timeout: 10000 }).should('be.visible');

    cy.get('[data-testid="delete-birthday-button"]').first().click();
    cy.get('.confirm-dialog', { timeout: 8000 }).should('be.visible');
    cy.get('.confirm-dialog .confirm-btn').click();

    cy.contains('Test User').should('not.exist');
  });

  it('should close add form when button clicked again', () => {
    cy.expandBirthdayForm();
    cy.get('[data-testid="birthday-name-input"]').should('be.visible');
    cy.get('[data-testid="add-birthday-button"]').click();
    cy.get('[data-testid="birthday-name-input"]').should('not.exist');
  });

  it('should undo a deleted birthday', () => {
    cy.expandBirthdayForm();
    cy.get('[data-testid="birthday-name-input"]').type('Undo User');
    cy.get('[data-testid="birthday-date-input"]').type('06/20/1995').blur();
    cy.get('[data-testid="save-birthday-button"]').click();
    cy.contains('Undo User', { timeout: 10000 }).should('be.visible');

    cy.get('[data-testid="delete-birthday-button"]').first().click();
    cy.get('.confirm-dialog', { timeout: 8000 }).should('be.visible');
    cy.get('.confirm-dialog .confirm-btn').click();
    cy.contains('Undo User').should('not.exist');

    cy.contains('UNDO', { timeout: 5000 }).click();
    cy.contains('Undo User', { timeout: 5000 }).should('be.visible');
  });
});
