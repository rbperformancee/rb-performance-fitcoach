# Changelog

All notable changes to RB Perform are documented here.

Format inspired by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Dates use ISO 8601 (YYYY-MM-DD).

## [Unreleased]

## [2026-04-25] — Enterprise CI, GDPR, post-deploy smoke, premium hardening

> Combined entry for a single ~36 h sprint. See git log between commits
> `4001c20c` and `b60d19d8` for the full sequence (~55 commits).

### Added
- `.github/workflows/ci.yml` — now enforces bundle budget 250 KB gzipped, validates security.txt Expires, runs `npm audit --omit=dev --audit-level=critical`, and after push to main runs a 20-check post-deploy smoke against rbperform.app.
- `.github/workflows/codeql.yml` — GitHub CodeQL JavaScript security + quality scan on push, PR, weekly cron.
- `.github/workflows/lighthouse.yml` — daily Lighthouse audit + push-triggered audit against 4 key pages with hard budget per page (perf/a11y/bp/seo); scores uploaded as artifact.
- `.github/SECURITY.md` — responsible-disclosure policy aligned with RFC 9116.
- `.github/dependabot.yml` — weekly npm + monthly GitHub Actions security PRs.
- `.github/ISSUE_TEMPLATE/{bug_report,feature_request,config}.md` + `PULL_REQUEST_TEMPLATE.md` — professional intake points.
- `CONTRIBUTING.md` — onboarding guide for a future second engineer.
- `LICENSE` — explicit All Rights Reserved.
- `CHANGELOG.md` (this file) — Keep a Changelog format.
- `docs/openapi.yml` — OpenAPI 3.1 spec covering the 14 `/api/*` endpoints.
- `docs/RUNBOOK.md` — 7 incident-response scenarios.
- `scripts/check-deploy.js` — one-command 20-check prod smoke (< 2 s parallel).
- `api/health.js` — liveness + deep readiness probe.
- `api/vitals.js` + inline collector on landing + founding — self-hosted Real-User Monitoring.
- `api/gdpr-export.js` — RGPD art. 20 data portability endpoint.
- `/status.html` — public auto-refresh status page.
- `public/.well-known/security.txt` — RFC 9116 contact file.
- `supabase/migrations/020_coach_payment_status.sql` — payment_issue columns on coaches.
- npm scripts for ops: `status`, `logs`, `logs:webhook|waitlist|crons|vitals`, `deploy:preview|prod|force`, `check:deploy`.

### Changed
- **Webhook** — handles 4 event types now (`checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`, `customer.subscription.updated`). Signature verification with explicit 300 s timestamp tolerance (anti-replay).
- **CSP** — 9 directives hardened: `base-uri 'self'`, `form-action 'self'`, `object-src 'none'`, cdnjs removed from script-src, `*.sentry.io` replaces `*.ingest.sentry.io` (EU ingest fix — CSP was blocking all frontend Sentry captures silently for 11 days).
- **Response headers** — added `Cross-Origin-Opener-Policy`, `X-DNS-Prefetch-Control`, `Permissions-Policy: interest-cohort=()` (FLoC opt-out), `Access-Control-Max-Age: 86400`, `X-Request-ID` on every `/api/*`.
- **Observability** — 16 endpoints + 7 crons + frontend all capture to Sentry with structured log prefixes `[ENDPOINT_STAGE_KIND]`.
- **README.md** — 5 badges (CI, CodeQL, Status, Security, License), enriched Operations section.
- **package.json** — description, license, author, repository, bugs, engines.node ≥22.
- **.editorconfig**, **.nvmrc**, **.gitignore** — repo hygiene baseline.
- **Legal page** — art. 20 self-service paragraph points at `POST /api/gdpr-export`, breadcrumb JSON-LD, canonical link, colour-contrast fixes on hero date.
- **All 10 HTML pages** — consistent `<meta name="theme-color">`, `color-scheme: dark`, `robots`, PNG favicon fallbacks, `rel="noopener noreferrer"` on every `target="_blank"`.
- **LCP** — `<link rel="preload" as="image" fetchpriority="high">` on the hero poster.
- **three.js chunk** — never downloads for users with `prefers-reduced-motion`.
- **Sentry chunk** — switched `@sentry/react` → `@sentry/browser` (−26 KB raw).

### Fixed
- 404-page missing description + `noindex, follow` + theme-color.
- Waitlist + notify-founding now echo `X-Request-ID` on OPTIONS responses.

### Security
- No `eval`, no `new Function`, no `dangerouslySetInnerHTML` anywhere in `src/` or `api/` — enforced by CI grep step.

### Additional detail (earlier in the same sprint)

Added :
- Public `/api/health` liveness + deep readiness probe (Supabase + Stripe checks) for external monitoring (UptimeRobot, BetterStack).
- Public `/status` page auto-refreshing every 30 s, keyed to `/api/health?deep=1`.
- `/.well-known/security.txt` (RFC 9116) with contact, policy, expires.
- `docs/RUNBOOK.md` with 7 incident-response scenarios.
- `/api/webhook-stripe` now handles `invoice.payment_failed` (churn signal + Sentry alert) and `customer.subscription.updated` (plan sync).
- Plan-aware welcome email via Resend after `checkout.session.completed`.
- `/api/billing-portal` — Stripe Customer Portal self-service for coaches.
- `api/_sentry.js` — fetch-based Sentry envelope helper, zero dep.
- Structured log prefixes: `[WAITLIST_*]`, `[FOUNDING_WAITLIST_*]`, `[WEBHOOK_*]`, `[CRON_*_FAILED]`.
- Meta `theme-color`, `color-scheme: dark`, robots directives on all 10 public HTML pages.
- LCP preload hint on `/images/hero-poster.jpg` with `fetchpriority=high`.
- `/dashboard/mon-compte?tab=abonnement` rewrite + query-param deep-link for Stripe Portal return URL.
- `.github/SECURITY.md`, `.github/dependabot.yml`, `.nvmrc`, `.editorconfig`.
- Enriched JSON-LD Organization (postal address, SIRET, contactPoint, Instagram).

### Changed
- Legal page: dual B2C/B2B CGV refactor (03.A Standards, 03.B Founder, 03.C Dispositions communes) + full section 04 DPA.
- Stripe client switched to lazy-init (`api/_stripe.js`) — no more module-load crashes on missing `STRIPE_SECRET_KEY`.
- Frontend Sentry: `@sentry/react` → `@sentry/browser` (−26 KB raw).
- Three.js `HeroBackground` now skipped entirely when `prefers-reduced-motion` is set (chunk never downloads).
- CSP tightened: added `base-uri 'self'`, `form-action 'self'`, `object-src 'none'`; removed unused cdnjs allowance; switched connect-src `*.ingest.sentry.io` → `*.sentry.io` (EU ingest was CSP-blocked).
- Security headers: added `Cross-Origin-Opener-Policy: same-origin-allow-popups`, `X-DNS-Prefetch-Control: on`, `Permissions-Policy: interest-cohort=()` (FLoC opt-out).
- Public CTAs (Starter/Pro/Elite/Founder) routed to `/waitlist` — Payment Links shared via DM only until app stabilises.
- Sitemap + robots.txt: `/waitlist` added, `/dashboard/`, `/rejoindre/`, `/coach/`, `/link` disallowed.
- A11y: `<main>` landmark on founding, aria-label on ROI calculator inputs, color-contrast fixes on `.cd-label`, `.back`, `.legal-hero-date`.

### Fixed
- **Critical webhook bug:** operator precedence in plan resolution (`||` + `===` + ternary misgrouped) — every paid coach would have been classified `'founding'` or `'pro'` instead of their actual plan. Parens added.
- **CSP blocking Sentry frontend captures** since setup (11 days silent). DSN was on `*.ingest.de.sentry.io` (EU), CSP only allowed `*.ingest.sentry.io`.
- Welcome email after payment: previously only logged the recovery link to Vercel logs; now sends via Resend with plan-aware template.
- `initStaticCursor is not defined` console error on every landing visit — undefined function call removed.
- Missing `<meta name="description">` on 404 page.
- Missing `rel="noopener noreferrer"` on external Instagram link (tabnabbing surface).
- Orphaned assets: `public/videos/hero.mp4`, `public/videos/20260421_*.mp4`, `public/rayan-avatar.png`, `public/og-image.svg`, `public/icon-maskable.svg` — ~3 MB removed.

### Security
- All 9 public `/api/*` endpoints and 7 cron jobs now wrap errors in Sentry captures.
- Rate-limit + origin check added on `/api/demo-client` and `/api/send-welcome`.
- `.claude/scheduled_tasks.lock` gitignored (local Claude Code state).

## [2026-04-17] — Founder offer refinement

### Changed
- Founder program: 50 → 30 places.
- Harmonised Founder messaging across all pages.

## [2026-04-14 and earlier] — Initial RB Perform launch

Previous history not reconstructed. See git log for detail.
