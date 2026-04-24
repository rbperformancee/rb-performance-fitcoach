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
    SentryRef.init({
      dsn: DSN,
      environment: ENV,
      release: RELEASE,
      tracesSampleRate: ENV === "production" ? 0.1 : 1.0,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
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
