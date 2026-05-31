# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Changed
- Dashboard stats component layout and styling refinements
- Dashboard facade service improvements and spec updates

---

## [0.6.0] - 2025-10-01

### Added
- Full internationalisation (i18n): English embedded, Italian locale lazy-loaded on demand
- Translation keys for auth, edit dialog, notifications, CRUD errors, birthday chart axes, category dialog, birthday items, remember-photo tooltip, sync/network status banners
- Cloudflare Pages deployment with `_headers`, `robots.txt`, and `cors.json`
- Lighthouse CI gate (runs against SSR server, enforces CSP-XSS and minification checks)
- OWASP Dependency-Check in CI pipeline
- Angular 19.2 upgrade with bundle budget tuning
- `preview` npm script for local SSR preview
- `kill-port.js` cross-platform script replacing fkill-cli

### Changed
- Angular upgraded from 17 to 19.2.22
- All components migrated from `CommonModule` to granular Angular standalone imports
- All services and dialogs migrated from constructor injection to `inject()` API
- Birthday form expand animation switched from height to `translateY` (snappier)
- Category filter: replaced `role="button"` div with an absolutely-positioned `<button>` overlay (a11y)
- Notification dismiss replaced with `role="status"` / `aria-live` region (a11y)
- Nav strip: active-state pill, auth-gated Messages link with lock icon
- Header: mobile `routerLinkActive`, direct sign-in for unauthenticated users
- CI serialises unit and e2e jobs; removed Firebase deploy step; port fixed to 4300

### Fixed
- `fix(auth)`: Google sign-in result dispatched directly from components (no intermediate effect)
- `fix(firestore)`: `birthDate` stored as plain string to prevent timezone shift
- `fix(auth-effects)`: observer errors fall back to `authStateChanged({ user: null })`
- `fix(csp)`: per-request nonce on SSR, font and avatar domains in `connect-src`, `frame-src` derived from `environment`
- `fix(security)`: added COOP header, removed `unsafe-hashes` from CSP
- `fix(notifications)`: `requestPermission()` moved out of service init — requires explicit user gesture
- `fix(a11y)`: promoted `h3` to `h2` in dashboard and home for correct heading hierarchy
- `fix(idb)`: write transactions resolve via `oncomplete`/`onabort` — prevents double-settle

### Performance
- Hero logo preloaded; fonts switched to `display=swap`; Google Sign-In preconnect script removed
- `logo.png` compressed; `logo-reminder.webp` removed
- Zod schemas dynamically imported at call sites (birthday form, backup, calendar, IDB, Firestore)
- Theme-transition rules scoped to `.theme-transitioning` only
- `footer logo` gets `width`/`height` and `loading=lazy`

---

## [0.5.0] - 2025-06-15

### Added — Feature #12: Automated Testing Suite (CI-runnable)

- **`cypress/e2e/indexeddb-source-of-truth.cy.ts`** — 3 tests: verifies IndexedDB write before reload and `syncStatus=local-only`
- **`cypress/e2e/network-errors.cy.ts`** — 4 tests: blocks Firestore/Auth via `cy.intercept`, verifies graceful degradation
- **`cypress/e2e/accessibility.cy.ts`** — 6 tests: axe-core (critical/serious violations only), skip-link, form, dark mode, chart
- **`cypress/e2e/chart-viewport.cy.ts`** — 9 tests: verifies deferred chart renders, ARIA structure, bars, sr-only table, current-month highlight
- `cypress-axe` and `axe-core` installed as dev dependencies
- `cy.mockDeferViewport()` command — patches `window.IntersectionObserver` before `cy.visit()` so `@defer(on viewport)` blocks render in Cypress headless/CI
- `cy.seedVisualTestData()`, `cy.enableDarkMode()`, `cy.disableDarkMode()`, `cy.disableAnimations()` commands
- `disableAnimations()` forces `opacity:1` on Material dialog containers (fixes dialog visibility in CI)
- `ARCHITECTURE.md` documenting overall system design

### Changed
- `allowCypressEnv: false` in `cypress.config.ts` to suppress Cypress 15 security warning
- Visual regression suite excluded from `e2e:headless` CI run (screenshots are local-only)

### Fixed
- **`skip-to-content.component.ts`**: replaced `top: -40px` with `clip: rect(0,0,0,0)` — axe no longer flags contrast when element is hidden
- **`birthday-chart`**: `figure`/`figcaption`, sr-only data table, and `aria-hidden` on decorative elements
- **`category-icon`**: added `role="img"` and `aria-label` to wrapper
- **`settings menu`**: `aria-label` and `aria-hidden` on all decorative icons
- **`import-export menu`**: `aria-hidden` on decorative icons

---

## [0.4.0] - 2025-05-01

### Added — Feature #11: Visual Regression Testing

- **`cypress/e2e/visual-regression.cy.ts`** — 13 snapshot suites across 7 scenarios (no external service, Percy removed)
- `cy.visualSnapshot(name)` command → `cy.screenshot(name, { overwrite: true })`
- `cy.seedVisualTestData()` — writes 4 fixed birthdays directly to IndexedDB (version 4) then reloads
- `cy.clock(new Date('2026-03-24T12:00:00.000Z').getTime())` frozen date for deterministic day-countdown counters
- `e2e:visual` and `e2e:visual:ci` npm scripts (latter uses `start-server-and-test`)

### Changed
- `clearIndexedDB()` properly awaits `deleteDatabase()` calls (was fire-and-forget)
- DB version bumped to **4** (v3→v4 added `errorReports` store)

---

## [0.3.0] - 2025-03-15

### Added — Feature #10: Firebase Storage Photo Optimisation

- **`PhotoStorageService`** — uploads photos to Firebase Storage, stores CDN URLs instead of base64 blobs in IndexedDB and Firestore
- **`OrphanPhotoCleanupService`** — daily scan of unreferenced Storage files; triggered on sign-in
- Client-side file-size validation before upload (max 7 MB)
- Firebase Storage security rules (`storage.rules`) scoped to authenticated users' own paths
- `deletePhotoByUrl` and `rememberPhoto` support in `PhotoStorageService`
- `storageGetters` accessor bag for testable Storage access
- Offline base64 fallback when Firebase Storage is unreachable
- `firebase/storage` SDK lazy-loaded alongside auth/firestore (never downloaded by anonymous users)

### Changed
- Photos in IndexedDB and Firestore migrated from base64 blobs to CDN URLs on first sign-in
- Upload/remove buttons disabled while a save is in progress
- Initial bundle remains ≤ 1.50 MB raw / 300 kB gzip — no budget warnings

### Fixed
- `base64ToFile` rewritten as async using `fetch` API
- Merged winner photo uploaded to Storage when both local and cloud records contributed to a merge conflict resolution
- `SecureStorage.getItem` handles malformed JSON gracefully

---

## [0.2.0] - 2025-01-20

### Added — Feature #9: Firebase Auth + Firestore

- Google Sign-In via Firebase Auth (`signInWithPopup`)
- Firestore bidirectional sync: local IndexedDB ↔ cloud (merge strategy on conflict)
- `AuthService` with `onAuthStateChanged` listener and `__Secure-fb_auth_hint` cookie for returning-user detection
- `SyncService` + NgRx sync store (`syncStatus`, `lastSyncAt`)
- Lazy Firebase SDK loading — anonymous users never download Firebase bundles (~510 kB)
- `isFirebaseConfigured()` guard for placeholder credentials (no runtime cost)
- `initFirebase()` idempotent initialiser shared across concurrent callers
- `getFirebaseAuthModule()` / `getFirestoreModule()` lazy accessor functions
- `APP_INITIALIZER` does **not** call `initFirebase()` — purely demand-driven
- Firestore write rate-limiting with Zod schema validation (`sanitizeBirthdayData`)
- Exponential backoff with jitter for transient Firestore errors (incl. `resource-exhausted`)
- Auth-gated UI: user avatar, sign-out button, sync-status banner, network-status indicator
- Orphan birthday cleanup on sign-in (removes local records deleted on another device)

### Changed
- `AUTH_HINT_COOKIE` stored as `__Secure-fb_auth_hint` (`Secure; SameSite=Strict; Max-Age=30d`) — JS-readable, not HttpOnly; auto-expires; CSRF-safe
- Anonymous sessions: Firebase never loads; loading spinner resolves immediately
- Returning users: Firebase loads async, then `onAuthStateChanged` fires
- Bundle budget: `maximumWarning: 1.6 MB`, `maximumError: 2 MB`

### Fixed
- `birthDate` stored as plain string in Firestore to prevent timezone shift on read-back
- Auth state observer errors fall back to `authStateChanged({ user: null })`
- `orphan-cleanup` converted from fire-and-forget to a catchError pipeline

---

## [0.1.0] - 2024-09-01

### Added — Initial Release

- Angular 17 standalone app with Angular Material design system
- Birthday CRUD: add, edit, delete with form validation (Zod schemas)
- Dashboard with statistics: monthly chart, next birthdays, age stats
- Search and filters: search by name, filter by month and category, sort options
- Category system with colour-coded filtering and overview stats
- Notification system: browser push notifications with permission prompt
- Scheduled messages: per-birthday custom message scheduling
- Undo on delete with snackbar action
- Double-click quick-edit for birthday names
- Inline editing for birthday cards with auto-save
- Photo upload and "Remember Photo" sharing feature
- Zodiac sign calculation and display
- PWA support: offline mode via IndexedDB, service worker, auto-sync queue
- Google Calendar integration: bidirectional sync, recurring age-calculation events
- Import / Export: JSON and CSV backup and restore
- Dark mode with system preference detection and manual toggle
- Responsive layout with mobile navigation strip
- Angular SSR (server-side rendering)

[Unreleased]: https://github.com/MihaelaAghirculesei/birthday-reminder-app/compare/v0.6.0...HEAD
[0.6.0]: https://github.com/MihaelaAghirculesei/birthday-reminder-app/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/MihaelaAghirculesei/birthday-reminder-app/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/MihaelaAghirculesei/birthday-reminder-app/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/MihaelaAghirculesei/birthday-reminder-app/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/MihaelaAghirculesei/birthday-reminder-app/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/MihaelaAghirculesei/birthday-reminder-app/releases/tag/v0.1.0
