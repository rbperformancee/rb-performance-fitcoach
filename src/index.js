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
  // Le hide du splash natif iOS est déclenché depuis App.jsx via un useEffect
  // qui watch `authLoading`. Avant il était hidé ici dès le 1er paint, mais
  // ça causait un flash noir entre splash → React (auth pas encore prête).
  // Maintenant : le splash logo éclair RB reste visible jusqu'à ce que l'auth
  // soit chargée, puis on hide en fondu.
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
