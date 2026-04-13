import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import OfflineBanner from "./components/OfflineBanner";
import { initSentry, captureError } from "./lib/sentry";
import { applyTheme, getStoredTheme } from "./lib/theme";

// Init Sentry AVANT le render — captures errors during initial mount
initSentry();

// Init theme avant le render pour eviter le flash
applyTheme(getStoredTheme());

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <ErrorBoundary name="App">
    <OfflineBanner />
    <App />
  </ErrorBoundary>
);

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
