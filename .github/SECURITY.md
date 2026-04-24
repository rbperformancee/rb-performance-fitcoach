# Security Policy

## Supported Versions

Only the latest version deployed on `rbperform.app` is actively maintained. Fixes are shipped directly via `git push origin main`.

## Reporting a Vulnerability

**Do not open a public issue.** Send the details to:

- **rb.performancee@gmail.com**

Include:
- Steps to reproduce
- Impact (what can an attacker do?)
- Affected endpoint / page / version (commit SHA if possible)
- Suggested mitigation

You can also reach us via the RFC 9116 contact file: <https://rbperform.app/.well-known/security.txt>

## Response Timeline

- **Acknowledgement:** under 72 hours.
- **Initial assessment:** under 7 days.
- **Fix deployment:** depends on severity — critical issues are patched within 24-48 hours.

## Disclosure

We prefer coordinated disclosure. Please allow us to ship a fix before publishing any write-up. Credit is given to the reporter in the release notes unless anonymity is requested.

## Scope

In scope:
- `rbperform.app` and all `*.rbperform.app` subdomains
- `/api/*` serverless endpoints
- The React app shell at `/app.html` and its routes
- Stripe webhook processing
- Supabase Auth / RLS / service-role flows

Out of scope (but still email us):
- Third-party services (Stripe, Supabase, Vercel, Resend, Zoho) — report to them directly
- `rbperform.com` — belongs to a separate offer
- Denial-of-service against rate-limited endpoints (5-60 requests per hour per IP are already enforced)
- Reports generated solely by automated scanners without demonstration of exploitability

## Defensive Measures Already in Place

- CSP with `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, tight `connect-src`
- Strict-Transport-Security with 2-year max-age + preload
- X-Frame-Options SAMEORIGIN + Content-Security-Policy frame-ancestors
- Cross-Origin-Opener-Policy: same-origin-allow-popups
- Stripe webhook signature verification
- Supabase RLS on user-facing tables
- Rate limiting + origin check on all public `/api/*` endpoints
- Sentry capture on every error path (server + client)
- No `eval`, no `dangerouslySetInnerHTML`, no inline event handlers on user input

Thank you for helping keep RB Perform safe.
