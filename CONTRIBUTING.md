# Contributing to RB Perform

Currently a single-maintainer project. This doc exists to make onboarding of a second engineer (or an external audit) zero-friction when the time comes.

## Setup

```bash
nvm use                 # respects .nvmrc (Node 22)
npm ci                  # install exact lockfile versions
cp .env.example .env    # then fill in local dev secrets
npm start               # http://localhost:3000 — React app shell
```

The marketing pages (`public/*.html`) are static — open them directly in a browser or via `npx serve public` for more realistic routing.

Serverless functions (`api/*.js`) require `vercel dev` to run locally:

```bash
npm i -g vercel
vercel link   # attach to rb-performances-projects/rb-perfor
vercel dev
```

## Before pushing

- [ ] `npm run build` compiles clean (CI will also enforce this)
- [ ] `node --check <modified /api/*.js>` passes
- [ ] `npx playwright test --project=chromium` passes (or update tests if behaviour changed)
- [ ] `git diff` contains no secrets (search for `sk_`, `whsec_`, `sbp_`, `re_`, `eyJ`)
- [ ] No new `console.log` in `src/` — use `captureError()` from `src/lib/sentry.js`
- [ ] No `dangerouslySetInnerHTML`, no `eval`, no `new Function`
- [ ] If adding a new `/api/*` endpoint: wrap with `secureRequest` or `rateLimit`, capture errors via `api/_sentry.js`

## Commit conventions

Follow Conventional Commits:

```
feat(scope): add subscription cancel email
fix(webhook): correct plan resolution precedence
chore(deps): bump stripe to 17.7.0
docs(runbook): add cron-down scenario
security(csp): tighten connect-src
perf(landing): preload hero poster
```

Scopes are optional but useful (`api`, `webhook`, `landing`, `legal`, `csp`, `deps`, …).

Body explains the "why", not the "what". The diff shows the what.

## Branching

No long-lived branches. Main is continuously deployed to production via Vercel. Features land directly on main once reviewed (for the solo-maintainer phase). When a second engineer joins:
- feature branches named `feat/short-description`
- PR → main, squash-merge, CI must pass

## Tests

- **Playwright E2E** in `e2e/` — run against prod by default (`PLAYWRIGHT_BASE_URL` env var overrides)
- **Health check** `npm run health` — manual smoke script
- No unit test framework wired yet. If you need one, prefer Vitest (no CRA eject needed for single files)

## Observability contract

Every server-side failure path must:
1. Log with a structured prefix (`[ENDPOINT_STAGE_KIND]` — see existing pattern)
2. Capture to Sentry via `captureException(err, { tags, extra })`
3. Never swallow exceptions silently

Frontend capture: `import { captureError } from '@/lib/sentry'`.

## Releases

No tags yet. All changes are deployed on merge to main via Vercel auto-deploy. Significant user-facing changes are recorded in `CHANGELOG.md` (Keep a Changelog format).

## Security

- `.github/SECURITY.md` — disclosure policy
- `public/.well-known/security.txt` — RFC 9116 contact file
- Do NOT open a public issue for a vulnerability. Email `rb.performancee@gmail.com`.

## Style

- `.editorconfig` enforces 2-space indent + LF
- No linter wired yet (no ESLint config committed). If you care, add one locally — just don't commit a config without team buy-in on the rules.

## Ops resources

- `docs/RUNBOOK.md` — incident response
- `/status` — public platform health
- `/api/health?deep=1` — JSON liveness for monitors
- Sentry project — tagged `endpoint` + `stage` + `plan` for filtering

---

**Questions ?** Email the maintainer. Good-faith contributions welcome.
