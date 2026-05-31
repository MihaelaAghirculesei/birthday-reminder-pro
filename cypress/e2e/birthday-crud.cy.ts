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
    // Wait for the Angular zone to fully settle before clicking edit:
    // (1) HomeComponent.loadDashboard() awaits a dynamic import — zone-tracked Promise
    // (2) NgRx IDB-write effect completes asynchronously
    // (3) @expandCollapse :leave animation (150ms WAAPI) finishes and removes the form
    // Without this, the edit click lands while Angular is mid-flight and the dialog
    // open call can be dropped or deferred, causing the .dialog-container assertion to
    // time out on the first attempt.
    cy.waitForAngular();

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
