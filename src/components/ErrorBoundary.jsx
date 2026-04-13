import React from "react";
import { captureError } from "../lib/sentry";

/**
 * ErrorBoundary — capture les erreurs React au render et affiche un fallback.
 * Evite les ecrans noirs silencieux : on voit le message d'erreur + stack.
 *
 * Usage:
 *   <ErrorBoundary name="ClientPanel">
 *     <ClientPanel ... />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    // eslint-disable-next-line no-console
    console.error(`[ErrorBoundary:${this.props.name || "unnamed"}]`, error, info);
    // Forward a Sentry avec le contexte (boundary name + composant React stack)
    captureError(error, {
      boundary: this.props.name || "unnamed",
      componentStack: info?.componentStack,
    });
  }

  reset = () => this.setState({ hasError: false, error: null, info: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error, info } = this.state;
    const stack = (info?.componentStack || "").trim();

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "#050505",
          color: "#fff",
          fontFamily: "-apple-system,Inter,monospace",
          padding: "40px 20px",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ fontSize: 11, letterSpacing: "3px", textTransform: "uppercase", color: "#ef4444", marginBottom: 12, fontWeight: 700 }}>
            Erreur · {this.props.name || "App"}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, marginBottom: 18 }}>
            Quelque chose a plante
          </h1>
          <div
            style={{
              background: "rgba(239,68,68,0.05)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: 14,
              padding: "16px 18px",
              marginBottom: 20,
              fontSize: 13,
              color: "#fca5a5",
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            <strong style={{ color: "#ef4444" }}>{error?.name || "Error"}:</strong> {error?.message || String(error)}
          </div>
          {stack && (
            <details style={{ marginBottom: 20 }}>
              <summary style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", cursor: "pointer", letterSpacing: "2px", textTransform: "uppercase", fontWeight: 700 }}>
                Stack trace
              </summary>
              <pre style={{ marginTop: 10, fontSize: 11, color: "rgba(255,255,255,0.55)", background: "rgba(255,255,255,0.03)", padding: 14, borderRadius: 12, overflow: "auto", lineHeight: 1.55 }}>
                {stack}
              </pre>
            </details>
          )}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={this.reset}
              style={{ padding: "12px 22px", background: "#02d1ba", color: "#000", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}
            >
              Reessayer
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: "12px 22px", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              Recharger l'app
            </button>
          </div>
        </div>
      </div>
    );
  }
}
