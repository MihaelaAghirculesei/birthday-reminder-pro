# Contributing

This is a personal learning project, but suggestions, bug reports and PRs are welcome.

## Setup

```bash
npm install
npm run env:init   # generates src/environments/*.ts from .env.local (or placeholders if absent)
npm start           # http://localhost:4203
```

`env:init` runs automatically before `start` and `build` too. Without a `.env.local`
(copy it from `.env.local.example`), the app builds and runs in offline/demo mode.
See [README → Getting Started](README.md#getting-started) for the full setup.

## Before opening a PR

Run the same checks CI runs:

```bash
npm run ci:quality   # lint + typecheck
npm run test:ci      # unit tests, coverage thresholds enforced
npm run e2e:ci        # Cypress E2E, headless
```

Or run the full pipeline in one shot with `npm run ci:local` (see [README → Testing](README.md#testing)).

CI itself runs lint, type checks, unit tests, E2E, Firebase security rules tests, and
a production build on every push to `main`/`develop` and every PR into `main`. Husky
also runs `lint-staged` on commit (ESLint `--fix` on staged `.ts`/`.html` files) and
commitlint on the commit message — both must pass locally before the commit is created.

## Commit conventions

This repo follows [Conventional Commits](https://www.conventionalcommits.org/)
(`type(scope): subject`), enforced by commitlint via a husky `commit-msg` hook (see
`commitlint.config.js`, extending `@commitlint/config-conventional`), e.g.:

```
fix(auth): guard against null user on token refresh
feat(dashboard): add category reassign dialog
docs: update README setup instructions
```

Common types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`, `perf`.

The commit history on `main` drives automated releases (`semantic-release`), so the
type and scope of each commit matter beyond style:
- `fix:` → patch release
- `feat:` → minor release
- `BREAKING CHANGE:` in the footer (or `!` after type/scope) → major release

## Code conventions

- Standalone Angular components, `inject()` for DI — no NgModules (see [ARCHITECTURE.md](ARCHITECTURE.md#adr-7-standalone-components-inject-no-ngmodules)).
- Components dispatch NgRx actions and select from the store; they don't call services directly.
- IndexedDB is the source of truth — Firestore is a synced replica, never read from directly by components. See [ARCHITECTURE.md § Offline-First & Sync Architecture](ARCHITECTURE.md#6-offline-first--sync-architecture) before touching sync code.
- `firebase/*` submodules are always dynamically imported (`type` imports only at the top of a file, `await import(...)` for runtime use) — never add a static import of a `firebase/*` package, it defeats the lazy-loading that keeps anonymous users from downloading the SDK.
- New unit test files must keep the project above its current coverage thresholds (`ng test --code-coverage`).

## Opening a pull request

1. Branch from `develop`.
2. Keep commits conventional — they end up in the changelog.
3. Push and open a PR **against `develop`** (not `main`).
4. Make sure `npm run lint`, `npm run typecheck`, and `npm run test:ci` pass locally before requesting review.

## Where to start

Check [README → Roadmap](README.md#roadmap) for known gaps (responsive design is the main one) and [README → Known Issues](README.md#known-issues).

For anything architectural — state shape, service layering, error flow, ADRs — read [ARCHITECTURE.md](ARCHITECTURE.md) first; it's kept up to date and answers most "why is this built this way" questions.
