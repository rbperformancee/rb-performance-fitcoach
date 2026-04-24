# RB Perform — Coaching Premium SaaS

[![CI](https://github.com/rbperformancee/rb-performance-fitcoach/actions/workflows/ci.yml/badge.svg)](https://github.com/rbperformancee/rb-performance-fitcoach/actions/workflows/ci.yml)
[![CodeQL](https://github.com/rbperformancee/rb-performance-fitcoach/actions/workflows/codeql.yml/badge.svg)](https://github.com/rbperformancee/rb-performance-fitcoach/actions/workflows/codeql.yml)
[![Status](https://img.shields.io/website?url=https%3A%2F%2Frbperform.app%2Fapi%2Fhealth&label=status&up_message=online&up_color=brightgreen&down_message=down&down_color=red)](https://rbperform.app/status)
[![Security policy](https://img.shields.io/badge/security-policy-blue)](./.github/SECURITY.md)
[![License: Proprietary](https://img.shields.io/badge/license-proprietary-lightgrey)](./LICENSE)

Application PWA de coaching sportif premium. Multi-tenant, white label, Mistral AI, Supabase.

> 🔴 **Prod** : https://rbperform.app — status en temps réel : https://rbperform.app/status

---

## 🚀 Stack

- **Frontend** : React 18 (CRA) + lazy loading + Suspense
- **Backend** : Supabase (Postgres + Auth + Edge Functions + Storage)
- **Paiements** : Stripe (Checkout, Payment Links, Customer Portal, webhooks avec signature verification + 300s tolerance)
- **AI** : Mistral La Plateforme (voice nutrition + FAQ chatbot)
- **Food DB** : Edamam Nutrition API
- **Hosting** : Vercel (frontend + serverless — `@sentry/browser` lazy-loaded, three.js lazy + skipped on `prefers-reduced-motion`)
- **Notifications** : Web Push + VAPID + Service Worker
- **Email** : Resend (transactionnel webhook welcome) + Zoho SMTP (waitlist + client notifications)
- **Monitoring** : Sentry frontend + backend (fetch-based envelope, zero dep), structured logs, `/api/health` + `/status` page
- **Tests** : Playwright E2E (59 pass, 3 test.fixme) + custom health-check
- **i18n** : FR (default) + EN (toggle in profile)

---

## 📋 Setup local

```bash
# 1. Clone + install
git clone https://github.com/rbperformancee/rb-performance-fitcoach
cd rb-perform
npm install

# 2. Configure .env (copier .env.example)
cp .env.example .env
# Editer .env avec tes cles

# 3. Lancer en dev
npm start

# 4. Build prod
npm run build

# 5. Tests
npm run health         # health check 75 tests sur prod
npm run test:e2e       # tests E2E Playwright (chromium)
npm run test:e2e:mobile # iPhone 14 simulator
```

---

## 🔑 Variables d'environnement

### Frontend (.env + Vercel env vars)

```
REACT_APP_SUPABASE_URL=https://xxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=sb_publishable_xxx
REACT_APP_VAPID_PUBLIC_KEY=BB...    # optionnel, fallback hardcoded
REACT_APP_SENTRY_DSN=https://xxx@sentry.io/xxx  # optionnel, error tracking
REACT_APP_RELEASE=rb-perform@1.0    # optionnel, pour Sentry releases
```

### Vercel serverless functions

```
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx   # CRITICAL pour les crons
MISTRAL_API_KEY=xxx                       # voice + FAQ
EDAMAM_APP_ID=xxx
EDAMAM_APP_KEY=xxx
CRON_SECRET=xxx                           # auth cron Vercel (auto par Vercel Cron)
```

### Supabase Edge Functions secrets

```
RESEND_API_KEY=re_xxx
VAPID_PUBLIC_KEY=BB...
VAPID_PRIVATE_KEY=xxx
VAPID_SUBJECT=mailto:contact@example.com

# Les secrets Stripe sont configures sur le site de vente (rbperform.app),
# pas sur l'app React. La fonction Supabase stripe-webhook reste deployee
# pour recevoir les events depuis Stripe via le site de vente.
STRIPE_SECRET_KEY=sk_xxx                  # utilise par stripe-webhook uniquement
STRIPE_WEBHOOK_SECRET=whsec_xxx           # signature validation
```

---

## 🗂️ Structure

```
src/
├── App.jsx              # routing principal + role detection
├── index.js             # entry point + Sentry init + ErrorBoundary
├── components/          # composants UI (50+)
│   ├── AppIcon.jsx      # bibliotheque SVG (30+ icons)
│   ├── EmptyState.jsx   # ecran "pas de donnees"
│   ├── Spinner.jsx      # 3 variants premium
│   ├── Skeleton.jsx     # loaders shimmer
│   ├── ErrorBoundary.jsx # safety net + Sentry forward
│   ├── OfflineBanner.jsx # indicateur reseau
│   ├── HelpPage.jsx     # FAQ utilisateur in-app
│   ├── LanguageToggle.jsx # switch FR/EN
│   ├── CoachDashboard.jsx
│   ├── ClientPanel inside CoachDashboard
│   ├── ...
├── hooks/               # custom hooks (useAuth, useFuel, useXP...)
├── lib/                 # utilities
│   ├── supabase.js      # client Supabase init
│   ├── haptic.js        # vibrations standardisees
│   ├── branding.js      # white label helpers
│   ├── tokens.js        # design tokens (colors, spacing, radius)
│   ├── i18n.js          # FR/EN dictionnary + hook
│   └── sentry.js        # error tracking (lazy)
├── utils/               # helpers (PDF, parser HTML programme...)
└── App.css              # global styles + animations + a11y

api/                     # Vercel serverless functions
├── _security.js         # rate limit + origin check
├── voice-analyze.js     # Mistral nutrition voice
├── food-search.js       # Edamam proxy
├── faq-assistant.js     # Mistral chatbot
├── cron-relance.js      # daily push notifs (9h UTC)
└── cron-weekly-recap.js # Monday 8h UTC

supabase/
├── migrations/          # SQL migrations (001-009)
└── functions/           # Edge functions (Deno)
    ├── send-welcome/    # multi-type emails
    ├── send-push/       # web push notifications
    ├── stripe-webhook/  # receveur des events Stripe (declenche par rbperform.app)
    └── weekly-recap/    # cron trigger

scripts/
├── health-check.js      # 75 tests automated
└── README-tests.md      # docs

e2e/
└── smoke.spec.js        # Playwright tests

public/
├── index.html           # SW register, fonts async, OG meta
├── sw.js                # Service Worker (cache + push)
├── manifest.json        # PWA
├── robots.txt
└── icons (192, 512, apple)
```

---

## 🎯 Concepts cles

### Multi-tenant + White Label
- Chaque coach a un `coach_code` (6 chiffres unique) + `coach_slug` (URL)
- Les clients sont rattaches via `clients.coach_id`
- Coach proprietaire (`rb.performancee@gmail.com`) = interface RB Perform originale
- Tous les autres coachs = white label : leur logo/nom/couleur, badge "Propulse par RB Perform" en bas
- Paiements : hors-app (site de vente rbperform.app). Coachs tiers : via leur `payment_link` personnel.

### Securite
- Origin check + rate limiting sur APIs publiques (`api/_security.js`)
- Webhook Supabase : validation signature HMAC SHA256
- VAPID keys en env vars (jamais hardcodees)
- Edge Functions secrets via Supabase Dashboard
- ErrorBoundary globale + une dediee ClientPanel
- 0 `dangerouslySetInnerHTML`

### Performance
- Lazy loading (10 chunks dont CoachDashboard, FuelPage, SuperAdmin)
- Bundle main : ~178 KB gzipped
- Service Worker : network-first HTML, cache-first assets, programme cache offline
- Fonts loaded async (display=swap)
- Images lazy + decoding async

### A11y
- focus-visible global (keyboard navigation)
- aria-modal sur modals
- Escape key support
- Touch targets >= 44px (iOS HIG)
- inputMode iOS optimal sur tous les inputs number

---

## 🧪 Tests

### Health check (75 tests)

```bash
npm run health
```

Couvre 7 categories :
- Authentification (6)
- Base de donnees / 19 tables (25)
- Flow client (11)
- Flow coach (7)
- Super Admin (6)
- APIs externes + crons + Edge Functions (14)
- Performances (6)

Voir `scripts/README-tests.md` pour details.

### Playwright E2E (9 tests)

```bash
npm run test:e2e            # chromium
npm run test:e2e:mobile     # iPhone 14
npm run test:e2e:headed     # voir le navigateur
```

Smoke + Performance. Tourne contre la prod par defaut (override avec `PLAYWRIGHT_BASE_URL`).

---

## 📦 Scripts npm

```
npm start              # dev server CRA
npm run build          # production build
npm run health         # health check (75 tests)
npm run test:e2e       # Playwright (chromium)
npm run test:e2e:mobile # Playwright (iPhone 14)
npm run test:e2e:headed # Playwright avec UI
```

---

## 📚 Documentation supplementaire

- [`CHANGELOG.md`](./CHANGELOG.md) — historique des releases (Keep a Changelog format)
- [`LAUNCH_CHECKLIST.md`](./LAUNCH_CHECKLIST.md) — audit pre-launch (perf, UX, PWA, SEO, a11y)
- [`SECURITY_AUDIT.md`](./SECURITY_AUDIT.md) — 14 failles fix + actions manuelles
- [`docs/RUNBOOK.md`](./docs/RUNBOOK.md) — incident response playbook (7 scenarios)
- [`.github/SECURITY.md`](./.github/SECURITY.md) — disclosure policy + scope
- [`public/.well-known/security.txt`](./public/.well-known/security.txt) — RFC 9116 contact file
- `scripts/README-tests.md` — guide health-check
- `supabase/migrations/*.sql` — schemas + RLS + triggers (lire dans l'ordre 001 → 009)

## 🩺 Operations

- **Status public** : [rbperform.app/status](https://rbperform.app/status) (auto-refresh 30s)
- **Health endpoint** : `GET /api/health` (liveness) ou `?deep=1` (readiness — checke Supabase + Stripe)
- **Observabilite** : Sentry frontend + 16 endpoints `/api/*` + 7 crons (tags: `endpoint`, `stage`, `plan`)
- **Logs structures** : `[WAITLIST_*]`, `[FOUNDING_WAITLIST_*]`, `[WEBHOOK_*]`, `[CRON_*_FAILED]` — grep dans `vercel logs --prod`
- **Incident response** : suivre `docs/RUNBOOK.md`

---

## 🎨 Design system

- **Couleur principale** : teal `#02d1ba`
- **Background** : `#050505` (client app), `#030303` (CEO)
- **Accent CEO** : indigo `#818cf8`, ivory `#f0ece4`
- **Fonts** : Bebas Neue (titles CEO), DM Sans (body), JetBrains Mono (numbers)
- **Spacing** : echelle 4px (`tokens.SP.xs/sm/md/lg/xl/xxl/xxxl`)
- **Radius** : `tokens.R.xs/sm/md/lg/xl/full`
- Tous les composants reutilisables : `EmptyState`, `Spinner`, `Skeleton`, `AppIcon`, `Toast`, `CoachLogo`, `InvitationPanel`, etc.

---

## 🏗️ Architecture decisions

**Pourquoi pas TypeScript ?** Decision pragmatique : l'app shippe vite, ErrorBoundary + tests E2E + Sentry capturent les regressions runtime. Migration TS possible plus tard si scaling.

**Pourquoi pas next.js ?** CRA suffit pour ce scope (PWA mono-page). Pas besoin de SSR (admin app + client app authentifie).

**Pourquoi pas Tailwind ?** Inline styles partout = 0 build setup, cohesion via tokens.js. Plus rapide pour iterations rapides.

**Pourquoi Supabase ?** Auth + Postgres + Realtime + Storage + Edge Functions = 1 service au lieu de 5. Free tier confortable pour demarrer.

---

## 🚦 CI/CD

Auto-deploy via Vercel sur push `main`. Pas de CI tests bloquants pour le moment (a ajouter via GitHub Actions si besoin).

Recommended pre-push checklist :
```bash
npm run build     # verifie compilation
npm run health    # 75/75 doit passer
npm run test:e2e  # 9/9 doit passer
```

---

## 📞 Support

- Issues : github.com/rbperformancee/rb-performance-fitcoach/issues
- Email : rb.performancee@gmail.com
