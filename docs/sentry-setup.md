# Sentry setup

Runtime error reporting is wired up already (`sentry-reporter.service.ts`, `SENTRY_DSN`
in `.env.local`/GitHub secrets). This covers the two pieces that aren't code and can't be
version-controlled: source map upload and alerting.

## Source maps (readable production stack traces)

The `build` job in `.github/workflows/ci.yml` uploads hidden source maps to Sentry after
every production build, then deletes them from the artifact before it's deployed. This
requires three repo secrets (Settings → Secrets and variables → Actions):

| Secret | Where to find it |
|---|---|
| `SENTRY_AUTH_TOKEN` | Sentry → Settings → Auth Tokens → new token with `project:releases` scope |
| `SENTRY_ORG` | Sentry org slug (URL: `sentry.io/organizations/<this>/`) |
| `SENTRY_PROJECT` | Sentry project slug for this app |

Without `SENTRY_AUTH_TOKEN` the upload step is skipped (build still succeeds) — errors
still reach Sentry, just with minified stack traces until the secret is added.

## Alerting

Not configurable from code — set up once in the Sentry dashboard:

1. Project → Alerts → Create Alert → "Issues" alert.
2. Trigger: new issue is created, **or** an issue's event frequency exceeds a threshold
   (e.g. > 10 events / hour) — the second one catches regressions, not just new bugs.
3. Action: email/Slack notification to whoever owns this project.
4. Consider a second alert on error-rate spikes (Alerts → "Metric" alert on the
   `event.count` metric) if traffic is high enough for that signal to be meaningful.

Without this, errors accumulate in Sentry silently — nothing pages anyone.
