import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <ErrorBoundary name="App">
    <App />
  </ErrorBoundary>
);

// Hook pour capturer les unhandled promise rejections
// (Supabase errors, fetch fails, etc.) — evite le silent fail
window.addEventListener("unhandledrejection", (e) => {
  // eslint-disable-next-line no-console
  console.error("[unhandledrejection]", e.reason);
});

// Hook pour capturer les erreurs globales runtime non-React
window.addEventListener("error", (e) => {
  // eslint-disable-next-line no-console
  console.error("[window.error]", e.error || e.message);
});
