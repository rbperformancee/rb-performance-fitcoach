import React, { useState } from "react";
import { supabase } from "../../lib/supabase";
import { AuthVisual, AuthStyles, GoogleIcon, G } from "./AuthShared";

/**
 * LoginPage — connexion coach classique email/password.
 * Route : /login
 * Apres succes: window.location.href = "/" → le dashboard se
 * charge (session Supabase active).
 */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Email et mot de passe requis.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        setError(
          error.message?.toLowerCase().includes("invalid")
            ? "Email ou mot de passe incorrect."
            : error.message
        );
        setLoading(false);
        return;
      }
      // Succes → redirige vers / (dashboard)
      window.location.href = "/";
    } catch (e) {
      setError("Erreur de connexion. Reessaie.");
      setLoading(false);
    }
  }

  async function loginWithGoogle() {
    setError("");
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/",
        },
      });
      if (error) {
        setError(error.message);
        setGoogleLoading(false);
      }
      // Redirection automatique par Supabase
    } catch (e) {
      setError("Google indisponible pour le moment.");
      setGoogleLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <AuthStyles />
      <AuthVisual />

      <div className="auth-form-panel">
        <h1 className="auth-title">Connexion</h1>
        <p className="auth-subtitle">Bon retour.</p>

        <form onSubmit={onSubmit} noValidate>
          <div className="auth-field">
            <div className="auth-label-row">
              <label className="auth-label" htmlFor="login-email">Email</label>
            </div>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`auth-input ${error ? "err" : ""}`}
              placeholder="ton@email.com"
              autoComplete="email"
              autoFocus
              required
            />
          </div>

          <div className="auth-field">
            <div className="auth-label-row">
              <label className="auth-label" htmlFor="login-password">Mot de passe</label>
              <a href="#" className="auth-link" onClick={(e) => { e.preventDefault(); forgotPassword(email, setError); }}>
                Mot de passe oublie ?
              </a>
            </div>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`auth-input ${error ? "err" : ""}`}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading || googleLoading}>
            {loading ? "Connexion en cours..." : "SE CONNECTER"}
          </button>

          {error && <div className="auth-error">{error}</div>}
        </form>

        <div className="auth-sep">ou</div>

        <button onClick={loginWithGoogle} className="auth-btn-ghost" disabled={loading || googleLoading}>
          <GoogleIcon />
          {googleLoading ? "Redirection..." : "Continuer avec Google"}
        </button>

        <div className="auth-foot">
          Pas encore de compte ? <a href="/signup">Commencer gratuitement →</a>
        </div>
      </div>
    </div>
  );
}

async function forgotPassword(email, setError) {
  if (!email.trim() || !/^[^@]+@[^@]+\.[^@]+$/.test(email.trim())) {
    setError("Entre ton email au-dessus, puis clique a nouveau.");
    return;
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: window.location.origin + "/reset-password",
  });
  if (error) setError(error.message);
  else setError("Email de reinitialisation envoye. Verifie ta boite mail.");
}
