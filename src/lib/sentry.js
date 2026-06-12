/**
 * Sentry — error tracking en production (LAZY-LOADED pour bundle thin).
 *
 * Setup :
 *   1. Creer un projet "rb-perform-frontend" sur sentry.io (gratuit jusqu'a 5K events/mois)
 *   2. Copier le DSN
 *   3. Ajouter REACT_APP_SENTRY_DSN dans Vercel env vars
 *   4. Redeploy
 *
 * Si REACT_APP_SENTRY_DSN n'est pas defini, Sentry n'est jamais charge (0 KB cost).
 */

const DSN = process.env.REACT_APP_SENTRY_DSN;
const ENV = process.env.NODE_ENV || "development";
const RELEASE = process.env.REACT_APP_RELEASE || "rb-perform@dev";

let SentryRef = null;        // module Sentry charge lazy
let initialized = false;
let bufferedEvents = [];     // events queue avant que Sentry charge

const IGNORE = [
  "ResizeObserver loop limit exceeded",
  "ResizeObserver loop completed",
  "Non-Error promise rejection captured",
  "NotAllowedError",
  "NetworkError",
  "Failed to fetch",
  "Load failed",
  "ChunkLoadError",
  "AbortError: The operation was aborted",
];

function shouldIgnore(error) {
  const msg = String(error?.message || error || "");
  return IGNORE.some((pattern) => msg.includes(pattern));
}

export async function initSentry() {
  if (initialized) return;
  if (!DSN) {
    if (ENV === "production") {
      // eslint-disable-next-line no-console
      console.info("[Sentry] REACT_APP_SENTRY_DSN absent — error tracking desactive");
    }
    return;
  }
  // Hotfix 12/06 : Sentry's console instrumentation throw TDZ "cannot access
  // uninitialized variable" sur Safari iOS (bug ouvert getsentry/sentry-javascript
  // avec certaines configs minifier+CRA). Désactivé en attendant un fix amont.
  return;
  initialized = true;
  // Lazy import : Sentry n'est telecharge QUE si DSN est set
  // → bundle initial reste fin pour les visiteurs sans tracking
  try {
    // @sentry/browser over @sentry/react: we don't use any React-specific
    // helpers (ErrorBoundary, profiler, router instrumentation), and this
    // drops those ~26 KB of raw code from the lazy chunk.
    //
    // NOTE: Replay / Feedback / Canvas SDKs are still transitively bundled
    // by @sentry/browser's default integrations. CRA webpack cannot tree-
    // shake them through a dynamic `import("@sentry/browser")`. Disabling
    // them via `defaultIntegrations: false` only gates them at runtime,
    // not build time — keeping as-is with replay sample rates at 0.
    SentryRef = await import("@sentry/browser");

    // Session Replay : capture une vidéo des 30s qui précèdent une erreur.
    // Déjà bundlé par @sentry/browser (cf commentaire ci-dessus), donc 0 KB
    // de coût additionnel — on l'active uniquement sur erreur (pas sur
    // session normale). Game-changer pour debug UI silencieuse (cf bug
    // LoginScreen 21→28 mai : bouton mort sans erreur visible, un replay
    // aurait montré le clic + state UI inchangé en 5 secondes).
    //
    // Privacy : `maskAllInputs: true` (défaut) masque tous les <input> en
    // RGB blocks dans le replay → pas de capture d'emails/passwords/etc.
    // `blockAllMedia: false` car on n'a pas de contenu sensible visuel.
    const integrations = [];
    try {
      if (SentryRef.replayIntegration) {
        integrations.push(SentryRef.replayIntegration({
          maskAllInputs: true,
          maskAllText: false,
          blockAllMedia: false,
        }));
      }
    } catch { /* replayIntegration may not be available — fallback silently */ }

    SentryRef.init({
      dsn: DSN,
      environment: ENV,
      release: RELEASE,
      tracesSampleRate: ENV === "production" ? 0.1 : 1.0,
      replaysSessionSampleRate: 0,         // Pas de capture sur session normale
      // 10% des erreurs declenchent un replay (down from 100% — 3 juin 2026).
      // Plan free Sentry = 50 replays/mois. Avec 100% on saturait au bout de
      // ~10j ("Replays are being dropped"). 10% nous garde sous la limite
      // toute l'année + on capte quand meme 1 replay sur 10 pour les bugs
      // recurrents. Si on upgrade plan Sentry, on pourra remettre a 1.0.
      replaysOnErrorSampleRate: 0.1,
      integrations,
      ignoreErrors: IGNORE,
      beforeSend(event) {
        if (ENV !== "production") return null;
        return event;
      },
    });
    // Flush les events bufferes avant le chargement
    bufferedEvents.forEach(({ error, context, type }) => {
      if (type === "user") SentryRef.setUser(context);
      else if (type === "tag") SentryRef.setTag(context.key, context.value);
      else SentryRef.captureException(error, { extra: context });
    });
    bufferedEvents = [];
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[Sentry] init failed:", e);
  }
}

export function captureError(error, context = {}) {
  if (shouldIgnore(error)) return;
  if (SentryRef) {
    SentryRef.captureException(error, { extra: context });
  } else if (initialized) {
    // En cours de chargement, on bufferise
    bufferedEvents.push({ error, context, type: "exception" });
  }
}

export function setSentryUser(user) {
  const payload = user ? { id: user.id, email: user.email } : null;
  if (SentryRef) {
    SentryRef.setUser(payload);
  } else if (initialized) {
    bufferedEvents.push({ context: payload, type: "user" });
  }
}

export function setSentryRole(role) {
  if (SentryRef) {
    SentryRef.setTag("role", role);
  } else if (initialized) {
    bufferedEvents.push({ context: { key: "role", value: role }, type: "tag" });
  }
}

// Breadcrumbs : trail des actions business clés pour faciliter le debug
// d'un crash en prod. Catégories standards : "user", "navigation", "http",
// "info", "error". Level : "info" | "warning" | "error".
export function addBreadcrumb({ category = "info", message, data = {}, level = "info" } = {}) {
  if (!message) return;
  if (SentryRef) {
    try {
      SentryRef.addBreadcrumb({
        category, message, data, level,
        timestamp: Date.now() / 1000,
      });
    } catch { /* noop */ }
  }
  // Pas de buffer ici : breadcrumbs = contexte, perdre quelques-uns pendant
  // le chargement de Sentry est acceptable.
}
