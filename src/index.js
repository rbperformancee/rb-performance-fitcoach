import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import OfflineBanner from "./components/OfflineBanner";
import ConsentAwareAnalytics from "./components/ConsentAwareAnalytics";
import { initSentry, captureError } from "./lib/sentry";
import { applyThemeWithMeta, getStoredTheme } from "./lib/theme";
import { preloadActiveLocale } from "./lib/i18n";

// Init Sentry AVANT le render — captures errors during initial mount
initSentry();

// Init theme avant le render pour eviter le flash (couche bas-niveau,
// pas besoin de React). Inclut sync meta theme-color pour la barre
// statut iOS PWA + tabs Chrome.
applyThemeWithMeta(getStoredTheme());

const root = ReactDOM.createRoot(document.getElementById("root"));

// Wave 5.7 — i18n bundle splitting : on attend que le chunk de la locale
// active soit charge AVANT le premier render, sinon t() renvoie les cles brutes
// pour ~50ms (FOUT). En cas d'echec reseau, on render quand meme (graceful).
preloadActiveLocale().catch(() => {}).finally(() => {
  root.render(
    <ErrorBoundary name="App">
      <OfflineBanner />
      <App />
      <ConsentAwareAnalytics />
    </ErrorBoundary>
  );
  // Hide le splash natif iOS UNE FOIS que React a monté + peint.
  // capacitor.config.ts a `launchAutoHide: false` → sans ce hide() le
  // splash reste 4s (fallback launchShowDuration). Avec ce hide(),
  // transition seamless splash → app (plus de noir 1.5s).
  // requestAnimationFrame x2 = attend qu'un frame réel ait été peint.
  if (typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.()) {
    requestAnimationFrame(() => {
      requestAnimationFrame(async () => {
        try {
          const mod = await import("@capacitor/splash-screen");
          await mod.SplashScreen.hide({ fadeOutDuration: 200 });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn("[splash] hide failed:", e);
        }
      });
    });
  }
});

// Hook pour capturer les unhandled promise rejections
// (Supabase errors, fetch fails, etc.) — envoye a Sentry en prod
window.addEventListener("unhandledrejection", (e) => {
  // eslint-disable-next-line no-console
  console.error("[unhandledrejection]", e.reason);
  captureError(e.reason || new Error("Unhandled rejection"), { source: "unhandledrejection" });
});

// Hook pour capturer les erreurs globales runtime non-React
window.addEventListener("error", (e) => {
  // eslint-disable-next-line no-console
  console.error("[window.error]", e.error || e.message);
  captureError(e.error || new Error(e.message), { source: "window.error" });
});
