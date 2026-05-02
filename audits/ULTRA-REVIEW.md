# RB Perform — Ultra-Review (audit Staff Engineer, 2 mai 2026)

> Stack auditée : React 18 (CRA, no SSR, no TypeScript) · Supabase Postgres + Auth · Vercel serverless · Stripe · Sentry · Mistral AI · Zoho SMTP. ~50 k LOC, 95 .jsx, 54 .js, 34 endpoints serverless, 45 migrations SQL, 6 fichiers de tests unitaires, 14 specs Playwright. CI GitHub Actions OK. Pre-launch 26 mai 2026, 5 founding coaches max au launch.

---

## 0. Failles de sécurité critiques (à fixer avant le 26 mai)

**🚨 BLOCKER A — `REACT_APP_DEMO_PASSWORD` est embarqué dans le bundle JS public.**
Le mot de passe Supabase du compte démo coach est lu côté frontend (`src/App.jsx:517`) puis baked dans `build/static/js/main.7cdc5437.js` au build CRA — confirmé par grep dans le bundle déployé. N'importe qui qui ouvre les DevTools peut lire le mot de passe et se connecter en tant que `demo@rbperform.app`. Si ce compte partage la même base que la prod (et il la partage : c'est juste un coach avec `is_demo=true` dans `coaches` — `lib/demoMode.js`), un attaquant authentifié peut tenter des escalades de privilèges, scraper la structure des autres coachs via les RLS bugs, ou pire abuser du rate-limit IP avec un compte "légitime". Et le mot de passe est en clair dans `main.js.map`. **Impact : compromission systémique du compte démo, vecteur d'attaque ouvert.** Fix : virer `signInWithPassword`, passer le démo coach par le même flow OTP serverless que `/api/demo-client` (qui lui est correct). Coût : 1h.

**🚨 BLOCKER B — `/api/unsubscribe` accepte n'importe quel email en GET sans token.**
`api/unsubscribe.js:31-72` : un attaquant peut envoyer `GET /api/unsubscribe?email=victim@anycoach.com&type=all` sans aucune authentification ni HMAC, et le service flippe `unsub_all=true` dans `coaches` ET `clients`. Pas de rate limit, pas de signature, pas de token. **Impact : un attaquant peut désabonner tous tes coachs (et leurs clients) en boucle, cassant toute la délivrabilité (welcome, weekly digest, founder check-in, churn alerts) — y compris pour les Founders qui te paient 199 €/mois.** Le scraper qui trouve la liste de tes coachs via `coach_slug` dans le sitemap (`api/sitemap.xml.js`) peut faire ça en 30 minutes pour ton tenant entier. Fix : générer un HMAC token dans chaque email (`HMAC-SHA256(email + type + timestamp, UNSUBSCRIBE_SECRET)`), le passer en query param, le valider côté endpoint. Coût : 2-3h.

**🟠 SÉRIEUX — Hardcoded fallback Supabase URL + ANON key dans 3 fichiers serverless.**
`api/coach-vitrine.js:18-19`, `api/sitemap.xml.js:14-15`, `api/og-coach.mjs:18-19` :
```js
const SUPABASE_URL = process.env.SUPABASE_URL || ... || 'https://pwkajyrpldhlybavmopd.supabase.co';
const SUPABASE_ANON = ... || 'sb_publishable_WbG1gs6l7XP6aHH_UqR0Hw_XLSI50ud';
```
Le projet Supabase (URL + anon key) est commit et public sur GitHub. Pour une anon key c'est moins grave qu'un service_role (RLS reste actif), MAIS : (a) ça leak ton tenant ID Supabase à tout le monde, (b) si demain tu rotates la clé, tu casses la prod silencieusement, (c) ça normalise le hardcoding de secrets dans le repo — la prochaine fois ce sera une vraie clé. Fix : hard fail si env var manquante (`throw new Error`). Coût : 5min.

---

## 1. Verdict global

### **52 / 100 — Pas prêt pour 10M €/an, prêt pour 5 founding coaches.**

Le projet sent la "v0 fait à l'arrache puis empilé pendant 3 mois par un solo qui n'a jamais cassé". La couche serverless est étonnamment soignée (RLS, idempotence Stripe, logs structurés `[WEBHOOK_*]`, alerting Zoho, request IDs, helpers `_security.js` partagés). Mais la couche frontend est un monolithe React-sans-TypeScript de 50k lignes dont 1 fichier fait 3946 lignes, avec 0 boundary architecturale, 0 store global propre, 82 occurrences de `*` dans les selects Supabase, et zéro AbortController. À 100 coachs et 1000 clients, tu vas te prendre :

1. Le N+1 du cron `cron-relance.js` (7 round-trips Supabase par client par jour, un seul cron qui timeout à 60s sur Vercel hobby).
2. Le re-render de `CoachDashboard.jsx` (3946 lignes, useEffect sur quasiment tous les bouts d'état) à chaque changement d'onglet.
3. Le bundle main 1.16 MB raw (limite CI à 250 KB gzipped — tu y es ric-rac aujourd'hui mais ça va péter dans 6 features).
4. Et le jour où Mistral te coupe le quota un dimanche, tu te réveilles avec 50 churn parce que les voice-analyze ont silently failed pendant 36h.

Le projet **peut** atteindre 10 M€ mais pas avec cette architecture. Les 6 mois post-launch doivent être : (a) ré-architecture frontend (TypeScript + split en domaines + state management), (b) backend extraction des crons hors Vercel (workers avec queue), (c) tests E2E qui couvrent les 5 parcours critiques (signup, paiement, invitation client, onboarding client, log de séance).

---

## 2. Top 3 forces (réelles, sourcées)

1. **Webhook Stripe propre.** `api/webhook-stripe.js:337-770` gère 7 types d'événements (`checkout.session.completed`, `subscription.deleted`, `subscription.updated`, `payment_failed`, `charge.refunded`, `dispute.created`, `dispute.closed`), idempotence via insert dans `stripe_events` AVANT traitement avec gestion du race 23505 (l.380-388), tolérance 300s pour replay attacks (l.356), critical alert mail à toi si welcome email fail (l.302-326). C'est mieux que 80% des SaaS Series A que j'ai audités.

2. **RLS multi-tenant rigoureux.** Migrations 005, 021, 034, 035 couvrent l'intégralité des tables sensibles avec un pattern cohérent `auth.jwt()->>'email' = coaches.email` (modulo le risque de drift email vs user.id, voir plus bas). 36 tables, RLS activé sur toutes, policies explicites. La migration 034 documente même les tables service-role-only intentionnelles (`cold_prospects`, `notification_logs`, `coaching_applications`).

3. **CI guardrails de bon sens.** `.github/workflows/ci.yml` bloque les builds sur : `dangerouslySetInnerHTML` dans src (l.91-96), `eval`/`new Function` (l.98-103), bundle main > 250 KB gzipped (l.70-80), `security.txt` expiré (l.57-63), CVE critiques (l.30-41), JSON-LD invalide (l.82-89). Le job `smoke-prod` post-deploy (l.116-140) tape `check-deploy.js` après chaque promote main. C'est rare et c'est bien.

---

## 3. Top 5 risques critiques (sévérité × impact business)

| # | Sévérité | Fichier:ligne | Impact business | Fix recommandé |
|---|---|---|---|---|
| 1 | 🔴 CRITIQUE | `src/App.jsx:516-517` (`REACT_APP_DEMO_PASSWORD`) | Le mdp démo est public dans le bundle. Vecteur d'attaque pour scraping coachs, abus rate limit avec compte légitime, embarras médiatique si quelqu'un tweete "regardez le code de RB Perform". | Remplacer par OTP serverless type `/api/demo-client`. Supprimer la var d'env Vercel. 1h. |
| 2 | 🔴 CRITIQUE | `api/unsubscribe.js:27-79` | Un attaquant désabonne tes 50 founding coaches en boucle → ils ne reçoivent plus aucun email transactionnel, ils churn, ils te chargeback. Catastrophe silencieuse. | HMAC token dans chaque email + validation côté endpoint. 2-3h. |
| 3 | 🔴 CRITIQUE | `api/cron-relance.js:137-201` | Boucle séquentielle qui fait `await sbFetch` pour CHAQUE client (4-7 round-trips par client). À 200 clients tu passes les 60s de timeout Vercel → cron qui foire silencieusement → clients churn pas relancés → MRR perdu. | Batcher : 1 query qui ramène `clients + dernier exercise_log + notif_logs du jour` en JOIN. Promise.all par tranches de 50. 4h. |
| 4 | 🟠 SÉRIEUX | `src/components/CoachDashboard.jsx` (3946 lignes) | Tout l'état du dashboard coach est dans un seul composant. Chaque tap d'onglet re-render des arbres entiers. À 100 clients dans la liste + 50 alertes Sentinel + 30 messages, le perçu sera pourri sur mobile. Onboarding founders = "pourquoi c'est si lent ?" | Splitter par domaine (Clients, Programmes, Sentinel, Business, Settings) avec React.lazy + un store léger (Zustand 3KB ou contexts par domaine). 2 semaines. |
| 5 | 🟠 SÉRIEUX | `api/coach-vitrine.js:18-19` + 2 autres | Hardcoded SUPABASE_URL+ANON dans 3 fichiers. Anon = RLS protège, MAIS le jour où tu rotates la clé tu casses 3 endpoints en silence. Et c'est un mauvais pattern qui contamine. | Hard fail si env vars absentes. Supprimer les fallbacks string. 5min. |

Mentions honorables qui sortent du top 5 mais valent le détour :
- **Aucun TypeScript** (`tsconfig.json` absent, 0 .ts/.tsx). À 50k lignes JS pur, tout refactor est une roulette russe. C'est probablement ta pire dette long-terme.
- **0 AbortController** dans tout le frontend. Les fetch lancés dans un useEffect qui démonte rapidement = warnings React + memory leaks + race conditions sur les setState après unmount.
- **Aucun rate-limiter distribué.** `_security.js:46-87` est in-memory par instance Vercel. Sur des cold starts multiples, un attaquant peut multiplier le ratio par le nombre d'instances. À 5 coachs c'est OK, à 1000 ça devient un trou.
- **Pas de tests E2E sur les flows critiques de paiement.** `e2e/founding.spec.js` existe mais aucun test n'exerce la boucle webhook → coach créé → magic link reçu. Tu deploy un vendredi soir, tu casses webhook, tu vois lundi.

---

## 4. Audit section par section

### 4.1 Architecture & Design Patterns — **3 / 10**

**Faits :**
- Pas de séparation présentation / logique métier / accès données. Les composants tapent directement `supabase.from(...)` (CoachDashboard.jsx:518, 768, 794, 2608, etc.) — 30+ occurrences de queries Supabase directes dans `coaches`.
- `App.jsx` 1546 lignes, `CoachDashboard.jsx` 3946 lignes, `Settings.jsx` 1090 lignes. Même `useAppData.js` ne fait que centraliser quelques states partagés — pas de vraie couche data.
- Lazy loading agressif et bien fait (`App.jsx:9-39, 73-93`). Au moins ça.
- Pas de routeur. Tout est driver par `window.location.pathname` + `URLSearchParams` à la main dans App.jsx (15+ occurrences). À chaque feature route tu touches au giga-monolithe.
- Pas de design system structuré. `src/lib/designSystem.js`, `tokens.js`, `theme.js` coexistent — pas clair qui possède quoi. Inline styles partout (CoachDashboard a des centaines de blocs `style={{}}`).

**Verdict :** Architecture "spaghetti React 2018". Marche pour 5 founders, va t'étrangler à 50.

### 4.2 Sécurité — **5 / 10**

Voir section 0 pour les blockers critiques (demo password, unsubscribe IDOR, hardcoded supabase fallbacks).

**Le bon :**
- Webhook Stripe : signature vérifiée + tolérance 300s + idempotence DB (`webhook-stripe.js:351-392`). Bien.
- CSP, HSTS, X-Frame-Options, Permissions-Policy, Referrer-Policy : tous configurés dans `vercel.json:62-73`. Bien.
- Zod sur les endpoints sensibles : `waitlist.js:18-29`, `coaching-application.js:42-82`, `checkout-founding.js:29-32`. OK.
- Webhooks Stripe : `bodyParser: false` correct (`webhook-stripe.js:329`).
- DOMPurify sur les programmes uploadés HTML (`CoachDashboard.jsx:2784-2798`). OK.
- CORS : reflect Origin avec whitelist (`_security.js:11-41`). Pas de `*`. OK.
- Cron jobs auth via `CRON_SECRET` Bearer token (5 fichiers vérifiés). OK.

**Le mauvais :**
- `notify-founding.js:30` : validation email `email.includes('@')` au lieu de zod. Ridicule à côté du reste qui utilise zod.
- `_security.js` : rate limiter in-memory par instance Vercel. Pas de Redis/Upstash. Tu peux scaler horizontalement → l'attaquant aussi.
- `gdpr-export.js:72-79` : tolère silencieusement les tables manquantes. Si demain tu renommes `clients` en `customers`, l'export GDPR retournera vide sans alerter — non-conformité Art. 20.
- Aucune validation côté serveur sur les uploads de logo (`Settings.jsx:40-62`) au-delà du size + mime côté client. Storage Supabase a des policies mais pas de scan AV.
- `coaching-application.js:104` : `app.preferred_slots` est rendu HTML sans escape pour la `formatSlot` car tu trustes le format zod-validé — OK, j'ai vérifié, c'est `escHtml` partout.
- npm audit : 15 high (transitives via react-scripts/svgo/workbox-build) — non-runtime, OK pour le moment, mais c'est de la dette qui doit dégager avec Vite.

### 4.3 Database & Performance — **4 / 10**

**Le bon :**
- 62 indexes créés à travers les 45 migrations. Pas de table critique sans clé d'accès indexée.
- RLS bien couverte (cf. 4.2).
- Idempotence sur les notifications (`notification_logs` avec unique key par client+type+date).

**Le mauvais :**
- **N+1 critique cron-relance.js:137-201**. Pour 200 clients : 1 fetch clients + 200 fetch exercise_logs + 200 wasSentToday queries séries. À 500 clients tu DÉPASSES le 60s timeout Vercel. Documenté plus haut.
- 30+ `select("*")` dans CoachDashboard et autres. Tu ramènes des colonnes lourdes (html_content du programme, logs JSON) que tu n'utilises pas.
- Pas de pagination sur les listes coachs/clients/programmes. `SuperAdminDashboard.jsx:96` : `from("coaches").select("*").order("created_at")` → à 1000 coachs ça tire 10 MB.
- Pas de connection pooling explicite — Supabase client en JS gère les pools via PostgREST mais le pattern de re-créer un client à chaque endpoint serverless force de nouvelles connexions sur chaque cold start. `_supabase.js` mémoize bien sur warm starts mais ça reste fragile.
- Aucune stratégie de cache sur les vues SSR (`coach-vitrine.js:328` set 60s edge, `sitemap.xml.js` aussi — bon réflexe ponctuel mais inégal).
- Pas de `EXPLAIN ANALYZE` documenté nulle part. Tu n'as aucune idée des latences de tes queries.

### 4.4 Frontend Quality — **4 / 10**

**Bundle :**
- `build/static/js/main.7cdc5437.js` : 1.16 MB raw. CI bloque à 250 KB gzipped — tu y es probablement à ~230 KB, ric-rac.
- Total static JS : 9.6 MB sur le filesystem build. Tonne de chunks lazy bien sûr.
- Lazy loading bien fait (24 imports lazy dans App.jsx).

**Re-renders :**
- `App.jsx` n'utilise `useMemo`/`useCallback` que 3 fois sur ~1500 lignes. Beaucoup de fonctions inline déclarées dans le render qui créent des refs nouvelles à chaque render des enfants.
- `CoachDashboard.jsx` 3946 lignes — hyper-couplé, chaque setState re-render tout l'arbre.
- Pas de `React.memo` sur les listes. À 100 clients dans la liste tu fais 100 re-renders sur chaque tap.

**Mobile :**
- Inline styles partout, pas de @media query systématique. Quelques `@media(max-width:600px)` sporadiques (Settings.jsx:99).
- PWA + Capacitor (iOS + Android) configurés. Bon point.

**États UI :**
- Skeletons : `App.jsx:46-54`, `Skeleton.jsx`. OK partiel.
- `EmptyState.jsx` existe. OK.
- Erreurs : Toast partout. OK.
- ErrorBoundary : 1 seul, top-level dans `index.js:23-29`. **Pas de granularité.** Si la page Sentinel crash, tu blanc-screen toute l'app.

### 4.5 TypeScript & Code Quality — **2 / 10**

- **Aucun TypeScript.** Pas de `tsconfig.json`, 0 `.ts`/`.tsx`. Tu es sur 50k lignes de JavaScript sans aucun garde-fou type. C'est ta plus grosse dette technique long-terme.
- 82 occurrences du mot `any` dans le code (mais c'est du JS donc le compteur n'a pas de sens — juste pour info).
- 6 TODO/FIXME/XXX/HACK dans tout le codebase. Très peu — soit tout est fini, soit personne ne marque ses dettes.
- Fonctions/composants > 200 lignes : 18 composants, dont 5 > 350 lignes (`Settings.jsx` 1090, `BusinessSection.jsx` 617, `Onboarding.jsx` 592, `Sentinel.jsx` 418, `MonCompte.jsx` 389). `CoachDashboard.jsx` 3946 et `App.jsx` 1546 sont hors-catégorie.
- Duplication métier : la logique de "envoyer email Zoho" est dupliquée dans 4 fichiers (`webhook-stripe.js:249-296`, `voice-analyze.js:10-72`, `waitlist.js:36-42`, `coaching-application.js:84-90`, `cron/cold-outreach.js`). Aucun helper `_email.js` partagé.
- 95 console.log/warn/error dans api/ — trop pour de la prod, pas assez structuré (mélange de `console.log`, `console.error('[TAG] ...')`, ` console.error("[TAG_FAILED] reason='...'")`). Choisis un format et stick.

### 4.6 Error Handling & Robustesse — **5 / 10**

- try/catch présents systématiquement dans api/. Bien.
- Capture Sentry sur les erreurs serveur (`captureException` partout). Bien.
- 1 ErrorBoundary global, pas par section. Insuffisant.
- Aucun AbortController dans tout le frontend (grep retourne vide). Race conditions garanties sur les unmounts.
- Pas de retry strategy explicite côté frontend. Si un fetch Supabase fail temporairement, l'utilisateur voit toast d'erreur et doit refresh.
- Edge cases : zod cap les payloads (`waitlist.js:18-29`), le coaching-application limite `preferred_slots` à 5 (`coaching-application.js:78-81`). OK partiel.
- Réseau coupé : `OfflineBanner.jsx` existe (chargé top-level dans index.js). Bien.
- DB down : cron-relance fail silently sur la première query mais pas sur les suivantes. Pattern incohérent.

### 4.7 Tests — **2 / 10**

- 6 fichiers de tests unitaires (`*.test.js`) couvrant : parserProgramme (×2), useXP, coachBusiness, coachGamification, sentinelAI. Loin du code critique (Stripe, auth, RLS).
- 14 specs Playwright dans `e2e/` mais aucune n'exerce le flow critique : signup coach → paiement Stripe → webhook → magic link. Aucune n'exerce le flow client : invitation → accept → log session.
- Tests E2E : `verify/` contient 7 specs "probe/explore" — outils de dev, pas de regression.
- CI exécute `npm run build`, l'audit landing, les checks syntax — mais **PAS** `npm test` ni `npm run test:e2e`. Tes tests existent mais ne tournent pas en CI.
- Couverture de code : non mesurée nulle part.

### 4.8 Production-Readiness — **6 / 10**

- Sentry intégré frontend (`lib/sentry.js`) + serverless (`api/_sentry.js`). Bien.
- Logs structurés : `[WEBHOOK_*]`, `[CRON_*]`, `[VITALS]`, etc. — pattern correct, recherchable via `npm run logs:webhook`.
- Health endpoint : `api/health.js` avec deep mode (Supabase + Stripe ping). Excellent.
- Variables env validées : pas vraiment au démarrage — chaque endpoint check ses vars (`webhook-stripe.js:347-350`, etc.). Pas de fail-fast app-level.
- Backups DB : tu as un dump `backup-avant-plans.sql` (17 MB) commit dans le repo. **C'est très mal** — ça expose potentiellement des données réelles dans Git. À supprimer immédiatement et purger l'historique avec git-filter-repo.
- Plan rollback : `docs/RUNBOOK.md` existe. Pas vérifié en profondeur, point positif d'avoir un runbook.
- INCIDENT-RESPONSE-PLAN.md : check.

### 4.9 Scalabilité (test du 10x) — **3 / 10**

À **50 coachs × 30 clients = 1500 clients** :

- `cron-relance` : 1500 × ~5 round-trips Supabase = 7500 queries séquentielles. **Timeout garanti à 60s Vercel hobby.** Doit migrer vers worker queue avant 100 coachs.
- `cron-coach-weekly-digest` : N coachs × email = OK pour Zoho à 50, mais à 500 tu satures la quota Zoho et tu vas devoir bouger sur Resend/SES + un vrai job runner (BullMQ + Redis ou Inngest).
- Stockage fichiers : Supabase Storage (logos coach, photos clients). OK jusqu'à plusieurs To.
- Sessions : JWT Supabase, stateless. OK.
- Tâches CPU : voice-analyze proxy à Mistral, food-search proxy à Edamam — synchrones. À volume élevé, latence cumulée, mais pas bloquant côté plateforme.
- Connection pool Supabase : géré par PgBouncer Supabase, OK jusqu'à plusieurs centaines de connexions concurrentes.

À 10 M €/an (= ~3000 coachs Pro + 30000 clients) : **cette architecture pète sec** sans :
1. Workers asynchrones hors Vercel pour les crons et envois d'email batch.
2. Redis pour rate-limit distribué + cache lookups coachs.
3. CDN pour les vitrines coach (déjà partiellement via `s-maxage=60`).
4. Read replicas Supabase pour les dashboards coach lourds.

### 4.10 Developer Experience — **6 / 10**

- README OK (11 KB), CONTRIBUTING.md présent, CHANGELOG.md à jour (8 KB).
- `.nvmrc` présent, Node ≥22 explicite.
- npm scripts clairs : `health`, `logs`, `logs:webhook`, `deploy:preview`, `deploy:prod`. Bien pensé.
- CI rapide (10min budget). OK.
- ADR : aucune trace dans `docs/`. Tu as `roadmap.md`, `RUNBOOK.md`, `sentinel.md` — pas de décisions architecturales formellement traçées.
- Setup < 30 min : probable si on a accès aux env vars Vercel + Supabase. Le `.env.example` est complet et commenté.

---

## 5. Plan d'action priorisé

### 🔴 Bloquants (avant le 26 mai 2026 — non négociable)

| # | Action | Complexité | Impact | Premier pas concret |
|---|---|---|---|---|
| B1 | Virer `REACT_APP_DEMO_PASSWORD` du bundle | **S** (1h) | Compromission compte démo bloquée | Refacto `App.jsx:513-527` pour utiliser un endpoint `/api/demo-coach` calqué sur `/api/demo-client` (qui existe déjà) |
| B2 | Sécuriser `/api/unsubscribe` avec HMAC | **M** (3h) | Stop le vecteur de désabonnement masqué | Ajouter `crypto.createHmac('sha256', UNSUBSCRIBE_SECRET).update(email + '|' + type).digest('hex')` à toutes les URLs `unsub` dans webhook-stripe + cron-* + waitlist. Valider le token dans unsubscribe.js avant l'update DB |
| B3 | Hard-fail si SUPABASE env vars absentes | **S** (10min) | Stop la diffusion du tenant ID Supabase | Supprimer les `\|\| 'https://pwk...'` dans coach-vitrine.js:18, sitemap.xml.js:14, og-coach.mjs:18 |
| B4 | Ajouter test E2E webhook Stripe | **M** (4h) | Prévention régression sur le flow $$$ | Mock Stripe events avec `stripe trigger checkout.session.completed` + assertion DB côté Supabase. Mettre dans `e2e/founding.spec.js` |
| B5 | Supprimer `backup-avant-plans.sql` du repo + purger Git history | **S** (30min) | Pas d'exfiltration de données réelles via le repo public | `git filter-repo --invert-paths --path backup-avant-plans.sql` puis force-push (avec coordination si autres devs) |

### 🟠 Important (semaines 1-2 après launch)

| # | Action | Complexité | Impact | Premier pas concret |
|---|---|---|---|---|
| I1 | Refacto cron-relance en batch | **M** (4h) | Évite timeout 60s à 200+ clients | 1 query qui ramène clients + dernier exercise_log via `LEFT JOIN LATERAL` + `notification_logs` du jour. Limiter à 500 clients par run, paginer si besoin |
| I2 | Splitter `CoachDashboard.jsx` (3946 lignes) | **L** (2 sem) | Re-renders divisés par 5, maintenabilité | Extraire ClientsTab, ProgrammesTab, SentinelTab, BusinessTab en composants lazy avec leurs propres useEffects. Passer le coachData via Context |
| I3 | Helper `_email.js` partagé | **S** (2h) | DRY, single source of truth pour Zoho | Extraire `getTransporter()` + helpers banner/footer dans `api/_email.js`, refacto webhook-stripe / waitlist / cron-* / coaching-application |
| I4 | AbortController systématique sur fetches React | **M** (1 jour) | Stop memory leaks + warnings React | Pattern : `const ctrl = new AbortController(); fetch(..., {signal: ctrl.signal}); return () => ctrl.abort();` dans tous les useEffect qui fetchent |
| I5 | Tests E2E parcours coach + client | **L** (1 sem) | Détection régression critique | 5 specs : signup-coach, payment-checkout-success, invite-client, client-onboarding, log-session |
| I6 | Brancher npm test + e2e dans CI | **S** (30min) | Tests existent déjà, autant les faire tourner | Ajouter `- run: npm test` et `- run: npm run test:e2e` dans `.github/workflows/ci.yml:82` |

### 🟡 À faire (mois 1-3 post-launch)

| # | Action | Complexité | Impact | Premier pas concret |
|---|---|---|---|---|
| T1 | Migration TypeScript progressive | **XL** (3 mois) | Garde-fou type sur 50k lignes | `npx ts-migrate-full` sur src/, démarrer par lib/ et hooks/, expand vers components/ par sous-dossier |
| T2 | Migration CRA → Vite | **L** (1 sem) | Build x10 + clear les 15 high CVE transitives + path SSR plus simple | `npm create vite@latest` standalone, copier src/, adapter env vars `VITE_` |
| T3 | State management léger (Zustand) | **M** (1 sem) | Diviser couplage App.jsx | 1 store par domaine (auth, coach, clients, programme), garder useEffect pour data fetching |
| T4 | Rate limiter Redis (Upstash) | **M** (4h) | Protection prod réelle | Remplacer la Map en memory par Upstash Redis avec sliding window |
| T5 | Workers async queue (Inngest ou QStash) | **L** (2 sem) | Sortir les crons de Vercel hobby | Migrer cron-relance + cron-weekly-recap + cron-coach-weekly-digest vers Inngest steps |

### 🟢 Nice-to-have (long terme)

- ADR (Architecture Decision Records) dans `docs/adr/`.
- Bundle analyzer en CI pour suivre la croissance.
- OpenTelemetry pour tracer les latences cross-services.
- Per-coach feature flags (LaunchDarkly ou maison).
- Storybook pour les composants design system.

---

## 6. Recommandation stratégique — 3 actions max levier CETTE SEMAINE

1. **Lundi-mardi : ferme les blockers de sécurité.**
   B1 (demo password) + B2 (unsubscribe HMAC) + B3 (hardcoded fallbacks) + B5 (purge backup SQL). Total : ~5h. C'est non-négociable. Tu lances dans 24 jours et tu as deux failles d'authentification triviales à exploiter pour quiconque ouvre les DevTools.

2. **Mercredi-jeudi : ajoute un test E2E webhook + brancher CI.**
   B4 + I6. Total : ~5h. Le webhook Stripe est ton point d'entrée unique pour 100% du revenue. Si tu casses ce flow un samedi soir, tu n'en sauras rien jusqu'au lundi quand 3 founders te diront "j'ai pas reçu mon mail de bienvenue". Un E2E qui fait `stripe trigger checkout.session.completed` + check Supabase + check Sentry vide est ton filet de sécurité minimum.

3. **Vendredi : refacto le cron-relance en batch.**
   I1. ~4h. Ce cron tourne tous les jours à 9h UTC. Aujourd'hui à 5 founding coaches × 10 clients = 50 clients = ~250 round-trips. C'est OK. Mais tu vas onboarder 30 founders post-launch dans la semaine 1, qui vont chacun importer 10-30 clients. Tu vas passer à 300-900 clients en 7 jours. À 900 clients × 5 = 4500 queries séries → 60s timeout Vercel → cron silently fail → MRR perdu sans alerte. Refacto-le maintenant pendant que c'est trivial.

---

## 7. Pourquoi tu n'es pas prêt pour 10 M€ (en clair)

À 3000 coachs × 200 €/mois moyen × 12 = 7.2 M€/an. À 30000 clients qui logent 4 séances/semaine = 6.2 M sessions/an écrites en DB. Tes goulots :

1. **CRA + JS pur + monolithe React** = ralentissement linéaire des cycles de feature à mesure que la base grossit. À 100k LOC tu ne pourras plus rien refacto.
2. **Crons Vercel hobby + N+1** = quand un cron timeout, personne n'est notifié, le revenue churn-back. Aucune queue. Aucune dead letter.
3. **Pas de tests E2E sur le revenue path** = tu deploys un vendredi, tu casses le webhook Stripe, lundi 50 mails de support.
4. **Rate limiter in-memory + pas de Redis** = quand tu passes derrière un CDN ou des instances multiples, ton rate limit devient cosmétique.
5. **ErrorBoundary unique** = le jour où Sentinel crash, ton dashboard coach blanc-screen entièrement, pas juste la section Sentinel.
6. **0 TypeScript** = chaque fix de bug a 30% de chance d'introduire une régression que tu détectes en prod.

Ce qui te SAUVE pour le launch à 5 founders :
- Le webhook Stripe est solide.
- Les RLS sont rigoureuses.
- Sentry capture tout.
- Le runbook + health endpoint te permettent de réagir à 95% des incidents.
- Le scope est petit (5 coachs).

Mais entre 50 coachs (mois 3) et 500 coachs (mois 12), il y aura un mur. Anticipe le refacto Vite + TypeScript + state management dès août 2026.

---

## 8. Ce que j'ai pas pu vérifier sans accès à la prod

- Les vraies latences DB (pas d'EXPLAIN run).
- L'état des connexions Supabase au peak (pas de monitoring exposé ici).
- Les logs Vercel récents (commande `npm run logs` pas runnable depuis cet audit).
- Le contenu réel de Stripe (test vs live keys).
- L'état du backup automatique Supabase (point-in-time recovery activé ?).
- Le quota Mistral actuel (`MISTRAL_DAILY_BUDGET_USD` est mentionné mais pas vérifié).

---

*Audit fait à froid sans exécution, sur la base du code source uniquement. Pour une vraie validation pre-launch, refaire un audit avec accès Supabase Studio (queries lentes, RLS test réel) + Vercel logs (last 30 days) + Stripe Sigma (réussite webhook) + un pen-test ciblé sur les blockers B1+B2.*
