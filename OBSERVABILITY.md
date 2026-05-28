# 📡 Observabilité RB Perform — Comment ne plus perdre 7 jours sur un bug silencieux

> **Pour qui ?** Pour Rayan, après le bug LoginScreen (21→28 mai 2026) qui a bloqué tous les nouveaux clients pendant 7 jours sans alerte.
> **Lecture** : 8 minutes.

---

## 🎯 Le problème qu'on résout

Le bug LoginScreen a été causé par un `event.trim()` qui throw TypeError dans un onClick handler React. Cette erreur :
- **Aurait dû être capturée par Sentry** (window.onerror est attaché par @sentry/browser par défaut)
- **N'a pas fait remonter d'alerte** chez Rayan pendant 7 jours
- **Aurait pu être identifiée en 5 minutes** avec Session Replay activé

Le code Sentry est OK depuis avril. **Le gap est dans la chaîne d'alerting et la non-activation de Session Replay.**

---

## ✅ Ce qui est en place (commit 28/05/26)

### 1. Sentry frontend — `src/lib/sentry.js`
- ✓ `@sentry/browser` lazy-loaded (bundle initial reste fin)
- ✓ DSN défini via `REACT_APP_SENTRY_DSN` en prod
- ✓ Capture des exceptions JS via `window.onerror` + `unhandledrejection` (défaut Sentry)
- ✓ `captureError()` exposé pour les capture explicites
- ✓ `setSentryUser()` après login pour attribution
- ✓ `addBreadcrumb()` pour le contexte avant un crash
- ✓ **NOUVEAU 28/05/26 : Session Replay activé** (`replaysOnErrorSampleRate: 1.0`)

### 2. ErrorBoundary autour de l'App
- ✓ `src/components/ErrorBoundary.jsx` wrap toute l'app dans `src/index.js`
- ✓ Catch les erreurs render React (mais pas les event handlers — c'est la limite React)

### 3. Sentinel monitoring backend
- ✓ `api/cron/sentinel-daily` + `sentinel-weekly` (déjà en place)
- ✓ Track les métriques business (signups, churn, payments) — pas le code health

---

## 🚨 Ce qu'il te reste à activer sur sentry.io (5 minutes)

**Sans alerting actif, Sentry capture l'erreur mais tu ne reçois rien.** C'est exactement pourquoi le bug LoginScreen est resté 7 jours invisible.

### Étape 1 — Connexion + projet
1. Va sur https://sentry.io
2. Login (Google ou GitHub avec l'email de Rayan)
3. Sélectionne le projet **rb-perform-frontend** (ou crée-le si absent — DSN doit matcher `REACT_APP_SENTRY_DSN`)

### Étape 2 — Configurer les alertes email

Va dans **Settings → Alerts → Create Alert Rule** puis crée ces 3 règles :

#### Règle 1 — Nouveau type d'erreur (high signal, low noise)
- **When**: `An event is captured`
- **If**: `the issue is first seen`
- **Then**: `Send notification to me via email`
- **Frequency**: `at most once per hour`

→ Tu reçois un email seulement quand une **nouvelle** erreur jamais vue arrive. Si LoginScreen avait throw, tu aurais eu cet email **immédiatement le 21 mai au matin**.

#### Règle 2 — Erreur en explosion (sanity check)
- **When**: `An event is captured`
- **If**: `the issue happens more than 50 times in 1 hour`
- **Then**: `Send notification to me via email`

→ Détecte les bugs qui touchent beaucoup d'utilisateurs en peu de temps.

#### Règle 3 — Erreur critique sur composant clé
- **When**: `An event is captured`
- **If**: `the tag "component" matches LoginScreen|SignupScreen|PaymentForm|CheckoutFlow`
- **Then**: `Send notification to me via email`
- **Frequency**: `at most once per 30 minutes`

→ Alerte renforcée sur les composants business-critical. (Note : il faut ajouter `Sentry.setTag('component', 'LoginScreen')` dans ces composants pour que ça matche — pas encore fait, voir TODO ci-dessous.)

### Étape 3 — Activer les Discover & Replays
1. **Settings → Replays → Enable** (devrait être ON gratuit jusqu'à 50/mois)
2. **Settings → Performance → Enable** (déjà ON probablement, vérifie)

### Étape 4 — Tester l'alerting (1 min)
Sur https://rbperform.app/app.html, ouvre la console DevTools et lance :
```js
throw new Error("Test alerting Sentry RB Perform — " + new Date().toISOString());
```
Tu dois recevoir un email Sentry dans les 5-15 minutes (avec lien vers le replay vidéo).

---

## 🛠️ TODOs code restantes (pas critiques mais utiles)

### TODO 1 — Tags par composant pour alerting fin
Dans les composants critiques (LoginScreen, SignupScreen, PaymentForm, CheckoutFlow), ajoute en haut du composant :

```jsx
import { addBreadcrumb } from '../lib/sentry';

useEffect(() => {
  addBreadcrumb({ category: 'navigation', message: 'mount: LoginScreen' });
  // Sentry browser ne supporte pas Sentry.setTag global sur un composant
  // sans wrapper — on utilise des breadcrumbs comme attribution
}, []);
```

Pas obligatoire — les erreurs sont déjà capturées sans tag, juste plus difficiles à filtrer.

### TODO 2 — Wrapper safeAsync pour les handlers onClick critiques

Anti-pattern qu'on a vu : `onClick={fn}` quand `fn` accepte un param non-event. Si oublié, throw silencieux.

Helper recommandé dans `src/lib/sentry.js` :

```js
export function safeAsync(fn, context = {}) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (e) {
      captureError(e, { ...context, source: 'safeAsync' });
      throw e; // re-throw pour ne pas casser l'UX si l'appelant gère déjà
    }
  };
}
```

Usage côté composant :

```jsx
const handleSubmit = safeAsync(async () => {
  // ...
}, { component: 'LoginScreen' });

<button onClick={() => handleSubmit()}>...</button>
```

Pas obligatoire — Sentry global handler attrape déjà la plupart des cas. Mais utile pour ajouter du contexte business à chaque erreur.

### TODO 3 — Source maps upload

Pour avoir des stacks lisibles en prod (pas du code minifié), il faut uploader les sourcemaps Sentry à chaque build.

**Option A** — Plugin webpack `@sentry/webpack-plugin` (déjà installé ?)
```bash
npm ls @sentry/webpack-plugin
```

**Option B** — CI/CD avec `sentry-cli` (Vercel build hook)

Note : déjà partiellement actif si tu vois des stack traces nominales dans Sentry. Sinon à configurer une fois.

---

## 📊 Monitoring proactif recommandé (quand temps dispo)

### Synthetic monitoring (uptime + flow critique)

Outils gratuits ou très bon marché :
- **Uptime Kuma** (self-hosted, gratuit) — check toutes les 60s `https://rbperform.app/`, `/app.html`, `/api/health`
- **Better Uptime / Pingdom** (~10€/mois) — alertes SMS sur down

### Synthetic flow critique (simule un login client)

Plus avancé : un cron Vercel qui simule chaque jour un login client end-to-end :

```js
// api/cron-synthetic-login-flow.js
// 1. POST /api/auth/check-invitation avec un email test
// 2. signInWithOtp simulé
// 3. Si non-200 OU timeout > 5s → alerte
```

Aurait détecté le bug LoginScreen le 21 mai à 9h du matin au lieu du 28 mai.

### Real User Monitoring (RUM)

Sentry Performance Monitoring est déjà actif (`tracesSampleRate: 0.1`). Tu peux voir dans le dashboard les transactions lentes — utile pour identifier les pages qui rament en prod.

---

## 🎯 Si tu ne fais qu'une chose

**Active les 3 alertes email Sentry ci-dessus (étape 2).** 5 minutes. C'est ce qui aurait sauvé les 7 jours du bug LoginScreen.

Le Session Replay est maintenant actif (déployé 28/05/26) — la prochaine erreur, tu auras une vidéo du clic + state UI. C'est game-changer.

---

*Doc créée le 28/05/26 par Claude Opus 4.7 en pair avec Rayan, suite au bug LoginScreen et au double-comptage potentiel LogPaymentModal détectés le même jour.*
