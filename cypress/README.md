# E2E Testing with Cypress

## Commands

```bash
npm run e2e
```

```bash
npm run e2e:headless
```

```bash
npm run e2e:ci
```

## Test Structure

- `cypress/e2e/` - E2E test files
- `cypress/fixtures/` - Test data
- `cypress/support/` - Custom commands and configuration

## Test Files

- `app.cy.ts` - Basic app functionality
- `birthday-crud.cy.ts` - Create, read, update, delete operations
- `category-filter.cy.ts` - Category filtering
- `notifications.cy.ts` - Notification system
- `offline-mode.cy.ts` - Offline functionality
- `search.cy.ts` - Search functionality

## Custom Commands

- `cy.clearIndexedDB()` - Clear all IndexedDB databases

## Data Test IDs

Use `data-testid` attributes in components for reliable element selection:

```html
<button data-testid="add-birthday-button">Add Birthday</button>
```
