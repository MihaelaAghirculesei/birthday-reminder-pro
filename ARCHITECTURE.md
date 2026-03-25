# Architecture Guide

> **Audience**: New contributors, code reviewers, anyone working on this codebase.
> **Scope**: Data flow, state management, storage layers, Firebase strategy, and key design decisions.

---

## Table of Contents

1. [High-Level Overview](#1-high-level-overview)
2. [NgRx State Shape](#2-ngrx-state-shape)
3. [Data Flow: Component → Store → Storage → Component](#3-data-flow)
4. [Storage Layers](#4-storage-layers)
5. [Firebase Lazy-Loading Strategy](#5-firebase-lazy-loading-strategy)
6. [Offline-First & Sync Architecture](#6-offline-first--sync-architecture)
7. [Service Layer Map](#7-service-layer-map)
8. [Effects Decomposition](#8-effects-decomposition)
9. [Photo Storage](#9-photo-storage)
10. [SSR Considerations](#10-ssr-considerations)
11. [Bootstrap Sequence](#11-bootstrap-sequence)
12. [Key Design Decisions (ADRs)](#12-key-design-decisions-adrs)

---

## 1. High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Browser / Android                            │
│                                                                     │
│  ┌──────────────┐    ┌──────────────────────────────────────────┐  │
│  │   Angular    │    │              NgRx Store                  │  │
│  │  Components  │◄──►│  birthdays | categories | auth | sync   │  │
│  │  (Signals)   │    │                  | ui                    │  │
│  └──────────────┘    └────────────┬─────────────────────────────┘  │
│                                   │ Effects                         │
│                      ┌────────────▼─────────────────────────────┐  │
│                      │           Service Layer                   │  │
│                      │  Facades → Domain Services → Storage     │  │
│                      └────────────┬──────────────┬──────────────┘  │
│                                   │              │                  │
│                      ┌────────────▼──────┐  ┌───▼──────────────┐  │
│                      │    IndexedDB       │  │  Firebase SDK     │  │
│                      │ (offline source    │  │  (lazy-loaded,    │  │
│                      │  of truth)         │  │  auth users only) │  │
│                      └───────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                                        │
                                              ┌─────────▼──────────┐
                                              │     Firestore       │
                                              │  (cloud replica +   │
                                              │   real-time sync)   │
                                              └────────────────────┘
```

**Core principles:**
- **IndexedDB is the source of truth** — the app works fully offline; Firestore is a cloud replica.
- **Firebase SDK is never loaded for anonymous users** — zero cost, zero latency for unauthenticated sessions.
- **NgRx is the single source of UI truth** — components never call services directly; they dispatch actions and select from store.
- **Optimistic updates** — CRUD operations update the store immediately, then persist asynchronously.

---

## 2. NgRx State Shape

```typescript
AppState {
  birthdays: BirthdayState        // EntityState<Birthday> + filters + loading + optimisticBackup
  categories: CategoryState       // EntityState<Category> + loading + error
  auth: AuthState                 // user | null, loading, error, initialized
  sync: SyncStatus                // state, lastSyncAt, pendingChanges, error, isOnline
  ui: UIState                     // theme, notifications, local UI flags
}
```

### `BirthdayState` (NgRx Entity)

```typescript
BirthdayState {
  ids: string[]
  entities: Record<string, Birthday>
  filters: {
    searchTerm: string
    selectedCategory: string | null
  }
  loading: boolean
  error: string | null
  optimisticBackup: Record<string, Birthday>   // used to roll back on failure
}
```

The `optimisticBackup` map is populated before an update/delete effect runs.
If the effect fails, the reducer restores the entity from this map.

### `Birthday` model

```typescript
Birthday {
  id: string
  name: string
  birthDate: string                      // ISO date string "YYYY-MM-DD"
  category?: string                      // Category.id reference
  photo?: string                         // CDN URL (Firebase Storage) or base64 fallback
  rememberPhoto?: string                 // "Remember me" photo — same format
  notes?: string
  email?: string
  phone?: string
  telegramUsername?: string
  zodiacSign?: string
  googleCalendarEventId?: string
  scheduledMessages?: ScheduledMessage[]
  // SyncMetadata
  updatedAt?: number                     // epoch ms — used for conflict resolution
  ownerId?: string | null                // Firebase UID or null for local-only
  syncStatus?: 'synced'|'pending'|'conflict'|'local-only'
  lastSyncedAt?: number
}
```

### `SyncStatus` slice

```typescript
SyncStatus {
  state: 'idle' | 'syncing' | 'error' | 'offline'
  lastSyncAt: number | null
  pendingChanges: number          // count of queued offline writes
  error: string | null
  isOnline: boolean
}
```

---

## 3. Data Flow

### Read path (app startup)

```
APP_INITIALIZER
  └─► authService.initAuthListener()     checks __Secure-fb_auth_hint cookie
  └─► syncCoordinator.initialize()       wires network + auth streams

loadBirthdays (action)
  └─► BirthdayCrudEffects.loadBirthdays$
        └─► OfflineStorageService.getAll('birthdays')   ← IndexedDB
              └─► loadBirthdaysSuccess({ birthdays })
                    └─► birthdayReducer                 ← EntityAdapter.setAll()
                          └─► selectAllBirthdays        ← selector
                                └─► DashboardComponent  ← async pipe / signal
```

### Write path (add/update/delete)

```
Component dispatches addBirthday({ birthday })
  │
  ▼
BirthdayCrudEffects.addBirthday$
  ├─1─► BirthdayService.create(birthday)      enriches with id, zodiac, syncMetadata
  ├─2─► OfflineStorageService.save('birthdays', enriched)   → IndexedDB (awaited)
  ├─3─► SyncCoordinator.queueChange('birthday', id, 'create', enriched)
  │       └─► PendingChangesService → IndexedDB pending-queue
  └─4─► dispatch addBirthdaySuccess({ birthday: enriched })
          └─► birthdayReducer: EntityAdapter.addOne()

If user is online + authenticated, SyncQueueProcessorService drains the queue:
  └─► FirestoreService.upsert(uid, 'birthdays', enriched)   → Firestore
        └─► dispatch syncActions.syncSuccess / syncError
```

### Filter/search path (pure store, no side effects)

```
Component dispatches setSearchTerm({ searchTerm })
  └─► birthdayReducer: state.filters.searchTerm = searchTerm
        └─► selectFilteredBirthdays (memoized selector)
              └─► Component re-renders
```

---

## 4. Storage Layers

| Layer | Technology | Purpose | When used |
|---|---|---|---|
| **NgRx Store** | In-memory | UI state, current session data | Always |
| **IndexedDB** | Browser DB | Offline-first persistent storage | Always (source of truth) |
| **Pending Queue** | IndexedDB (separate store) | Queue writes for when offline | On every mutation |
| **Firestore** | Cloud DB | Cloud replica, multi-device sync | Auth users only |
| **Firebase Storage** | CDN | Photo blobs → CDN URLs | Auth users only |
| **LocalStorage** | Browser | App settings (theme, locale) | Synchronous reads needed |
| **Cookie** | Browser | Auth hint (`__Secure-fb_auth_hint`) | Login/logout only |

### IndexedDB database

- **DB name**: `BirthdayReminderDB`
- **Version**: 3
- **Stores**: `birthdays`, `categories`, `pending-changes`
- Both `IndexedDBStorageService` (data) and `PendingChangesService` (queue) share this same DB instance.

---

## 5. Firebase Lazy-Loading Strategy

Firebase SDK adds ~510 kB to the bundle. The entire SDK is **deferred until after login**.

```
src/app/firebase.config.ts
  ├── isFirebaseConfigured()     → checks for placeholder credentials (no Firebase cost)
  ├── initFirebase()             → dynamic import('firebase/app') + init; idempotent,
  │                                concurrent callers share the same Promise
  ├── getFirebaseAuthModule()    → returns lazily-loaded auth module object
  └── getFirestoreModule()       → returns lazily-loaded firestore module object

All Firebase service files use:
  import type { ... } from 'firebase/...'   ← type-only, zero runtime cost
  const { signInWithPopup } = await getFirebaseAuthModule()  ← runtime load on demand
```

### Auth hint cookie

On sign-in: `__Secure-fb_auth_hint=1; Secure; SameSite=Strict; Max-Age=2592000; Path=/`
On sign-out: cookie is cleared.

`initAuthListener()` logic at app boot:

```
cookie present?
  YES → initFirebase() (async) → onAuthStateChanged → dispatch authSuccess/authFailure
  NO  → dispatch authInitialized({ user: null }) — Firebase SDK never loaded
```

**Result**: Anonymous users never download Firebase. The initial bundle stays ~1.5 MB / ~300 kB gzip.

---

## 6. Offline-First & Sync Architecture

```
User action (add/update/delete)
  │
  ├─► [1] Write to IndexedDB immediately (source of truth)
  ├─► [2] Update NgRx store optimistically
  └─► [3] Enqueue to pending-changes (IndexedDB)
              │
              ▼
        SyncCoordinatorService (thin orchestrator)
          ├── watches NetworkService.online$
          ├── watches AuthSelectors.selectAuthUser
          └── delegates to:
              ├── CloudSyncService          ← Firestore real-time listeners
              └── SyncQueueProcessorService ← drains pending-changes queue

When back online + authenticated:
  SyncQueueProcessorService.processPendingChanges()
    └─► foreach pending change:
          └─► FirestoreService.upsert / delete
                └─► on success: remove from pending-changes queue
                └─► on failure: retry on next online event

Firestore → local (real-time):
  CloudSyncService.setupListeners(uid)
    └─► onSnapshot(birthdays collection)
          └─► dispatch loadBirthdaysSuccess (merges remote changes)
```

### Migration (first login)

When a user signs in for the first time, all local-only records are migrated:

```
CloudSyncService.checkForMigration(uid)
  └─► migrateLocalToCloud()
        └─► reads all IndexedDB birthdays where ownerId === null
              └─► batch writes to Firestore with ownerId = uid
                    └─► updates IndexedDB records: syncStatus = 'synced'
```

---

## 7. Service Layer Map

```
Features / Components
        │
        ▼
┌───────────────────────────────┐
│        Facade Services        │   High-level API for components
│  DashboardFacadeService       │   Aggregates store + domain logic
│  CategoryFacadeService        │   Hides NgRx details from feature components
└───────────────┬───────────────┘
                │
        ┌───────▼────────────────────────────────────────────────────────┐
        │                    Domain Services                              │
        │  BirthdayService           ID gen, zodiac, normalization       │
        │  BirthdayNormalizationSvc  Canonical data shape                 │
        │  BirthdayMergeService      Dedup on import                     │
        │  BirthdayStatsService      Calculations for dashboard          │
        │  CategoryStorageService    Category CRUD                       │
        └───────┬────────────────────────────────────────────────────────┘
                │
        ┌───────▼────────────────────────────────────────────────────────┐
        │                 Infrastructure Services                         │
        │  OfflineStorageService     IndexedDB generic CRUD              │
        │  IndexedDBConnectionSvc    Connection pool / version management │
        │  PendingChangesService     Offline write queue (IndexedDB)     │
        │  FirebaseAuthService       Google sign-in, auth state          │
        │  FirestoreService          Firestore CRUD + real-time listeners │
        │  PhotoStorageService       Upload/delete/migrate photos        │
        │  CloudSyncService          Real-time listeners + migration      │
        │  SyncQueueProcessorService Drain pending-changes queue         │
        │  SyncCoordinatorService    Orchestrator (wires the above)      │
        │  NetworkService            online$/offline$ observables        │
        │  PushNotificationService   Orchestrates browser/native notifs  │
        │  NotificationFormatterSvc  Message templating ({name}, {age})  │
        │  BrowserNotifSchedulerSvc  Browser notification scheduling     │
        │  GoogleCalendarService     Calendar API client                 │
        │  CalendarIntegrationSvc    Business logic for calendar sync    │
        │  BackupService             JSON/CSV/vCard import-export        │
        │  ThemeService              Dark mode                           │
        │  LocaleService             i18n (ngx-translate)               │
        │  LoggerService             Structured logging                  │
        │  GlobalErrorHandler        Catches unhandled errors            │
        └────────────────────────────────────────────────────────────────┘
```

---

## 8. Effects Decomposition

The birthday store has **four separate effects classes** to keep each file focused:

| Class | File | Responsibility |
|---|---|---|
| `BirthdayCrudEffects` | `birthday-crud.effects.ts` | load, add, update, delete, import, test data |
| `BirthdayCalendarSyncEffects` | `birthday-calendar-sync.effects.ts` | Google Calendar event create/update/delete |
| `BirthdayNotificationEffects` | `birthday-notification.effects.ts` | Schedule push notifications on add/update |
| `BirthdayMessageEffects` | `birthday-message.effects.ts` | Scheduled message CRUD within a birthday |

Other effect classes:

| Class | Responsibility |
|---|---|
| `CategoryEffects` | Category CRUD → IndexedDB |
| `AuthEffects` | Firebase sign-in, sign-out, auth state changes |
| `SyncEffects` | Trigger sync on network/auth change, expose pending count |

---

## 9. Photo Storage

Photos have two storage paths depending on auth state:

```
User picks photo
  │
  ├─► Auth user → PhotoStorageService.upload(file)
  │     ├─► firebase/storage: uploadBytes → getDownloadURL
  │     └─► stores CDN URL string in birthday.photo
  │
  └─► Anonymous user → base64 encode
        └─► stores data URI string in birthday.photo (IndexedDB only)

On first login (migration):
  PhotoStorageService.migrateBase64Photos(uid)
    └─► foreach birthday with base64 photo:
          ├─► upload to Firebase Storage → CDN URL
          └─► update birthday.photo in IndexedDB + Firestore
```

CDN URLs reduce IndexedDB size significantly (base64 ~33% larger than binary).
Photos are stored under `users/{uid}/photos/{uuid}` in Firebase Storage.

---

## 10. SSR Considerations

The app uses Angular SSR (Express). Several services must be SSR-safe:

| Pattern | Why |
|---|---|
| `isPlatformBrowser(PLATFORM_ID)` guard | IndexedDB, notifications, Capacitor are browser-only |
| `APP_INITIALIZER` does NOT call `initFirebase()` | Firebase uses browser APIs; would crash on server |
| `initAuthListener()` is a no-op on server | `isPlatformBrowser` check at the top |
| `SyncCoordinator.initialize()` returns early on server | Same guard |
| Service Worker only registered in browser | `enabled: !isDevMode()` + `isPlatformBrowser` |

SSR renders the initial HTML shell. Angular then **hydrates** it in the browser.
Cypress tests must call `cy.waitForAngular()` after `cy.visit('/')` to wait for hydration before interacting.

---

## 11. Bootstrap Sequence

```
1. Angular bootstraps (app.config.ts)
   ├── provideStore({ birthdays, categories, ui, auth, sync })
   ├── provideEffects([BirthdayCrudEffects, ...all effects])
   └── APP_INITIALIZER runs initializeApp():
         ├── LocaleService.initialize()           sets up ngx-translate
         ├── FirebaseAuthService.initAuthListener()
         │     ├── cookie present? → lazy-load Firebase → onAuthStateChanged
         │     └── no cookie?      → dispatch authInitialized(null) immediately
         └── SyncCoordinatorService.initialize()
               ├── PendingChangesService.initialize()   opens IndexedDB
               ├── watches NetworkService.online$
               └── watches selectAuthUser
                     └── on user: CloudSyncService.setupListeners(uid)

2. Router activates → DashboardComponent
   └── dispatch loadBirthdays()
         └── BirthdayCrudEffects.loadBirthdays$
               └── OfflineStorageService.getAll() → IndexedDB
                     └── loadBirthdaysSuccess → birthdayReducer → UI renders
```

---

## 12. Key Design Decisions (ADRs)

### ADR-1: IndexedDB as source of truth (not Firestore)

**Decision**: All reads/writes go to IndexedDB first. Firestore is synced asynchronously.
**Why**: The app must work offline on unreliable mobile connections. Firestore's offline SDK adds >300 kB and has limitations with Capacitor. IndexedDB gives full control.
**Trade-off**: Conflict resolution is manual (last-write-wins via `updatedAt` timestamp).

### ADR-2: Firebase SDK loaded lazily (not in initial bundle)

**Decision**: `firebase/*` is never statically imported. Dynamic `import()` inside `initFirebase()`.
**Why**: The Firebase SDK adds ~510 kB. Most users are anonymous most of the time.
**Trade-off**: First sign-in has a ~300 ms extra delay while the SDK loads.

### ADR-3: NgRx Entity adapter for birthdays and categories

**Decision**: Use `@ngrx/entity` for normalized collection state.
**Why**: O(1) lookups, built-in CRUD helpers, consistent selector pattern.
**Trade-off**: More boilerplate than a plain array; worth it at 100+ birthdays.

### ADR-4: Separate effects files per concern (not one monolithic file)

**Decision**: Birthday effects split into `crud`, `calendar-sync`, `notification`, `message`.
**Why**: A single file would be 600+ lines. Each concern can be reviewed and tested independently.
**Trade-off**: Slightly more files; worth it for maintainability.

### ADR-5: Optimistic updates with rollback backup

**Decision**: Store dispatches `*Success` immediately; `optimisticBackup` allows rollback on `*Failure`.
**Why**: UI feels instant. IndexedDB writes are fast but not instantaneous.
**Trade-off**: On failure, the UI briefly shows the change before reverting.

### ADR-6: `__Secure-` prefixed SameSite=Strict cookie for auth hint

**Decision**: Use a JS-readable (not HttpOnly) cookie with `__Secure-` prefix and `SameSite=Strict`.
**Why**: Must be readable by JS to decide whether to load Firebase at boot. `__Secure-` enforces HTTPS. `SameSite=Strict` prevents CSRF. Auto-expires after 30 days.
**Trade-off**: Not HttpOnly, but the cookie stores no secret — only a boolean hint.

### ADR-7: Standalone components + `inject()` (no NgModules)

**Decision**: Angular 19 standalone components throughout; `inject()` for DI in constructors.
**Why**: Simpler mental model, tree-shakeable, no module boilerplate.
**Trade-off**: Some testing patterns differ (no `TestBed` module imports needed, but `inject()` requires Angular DI context).
