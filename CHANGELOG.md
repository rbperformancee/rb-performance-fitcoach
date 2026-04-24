# Changelog

All notable changes to RB Perform are documented here.

Format inspired by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Dates use ISO 8601 (YYYY-MM-DD).

## [Unreleased]

## [2026-04-25] — Premium hardening sprint

### Added
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
