import React, { useState, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import { AuthVisual, AuthStyles, GoogleIcon } from "./AuthShared";

/**
 * SignupPage — inscription coach email/password.
 * Route : /signup
 *
 * Apres signUp, Supabase envoie un email de confirmation.
 * On affiche ecran de confirmation avec l'email pour que le
 * coach sache qu'il doit verifier sa boite.
 */
export default function SignupPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [accepted,  setAccepted]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error,     setError]     = useState("");
  const [sentEmail, setSentEmail] = useState(null);

  // Force du mot de passe: 0/1/2/3
  const strength = useMemo(() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) s++;
    if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) s++;
    return s;
  }, [password]);
  const strengthLabel = ["", "Faible", "Moyen", "Solide"][strength];

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (!firstName.trim() || !lastName.trim()) {
      setError("Prenom et nom requis."); return;
    }
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email.trim())) {
      setError("Email invalide."); return;
    }
    if (password.length < 8) {
      setError("Mot de passe: minimum 8 caracteres."); return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas."); return;
    }
    if (!accepted) {
      setError("Accepte les CGU pour continuer."); return;
    }

    setLoading(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: fullName, first_name: firstName.trim(), last_name: lastName.trim() },
          emailRedirectTo: window.location.origin + "/",
        },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      // Si auto-confirm est OFF (prod), il faut verifier l'email
      if (data?.user && !data.session) {
        setSentEmail(email.trim().toLowerCase());
        setLoading(false);
        return;
      }
      // Session active immediatement → dashboard
      window.location.href = "/";
    } catch (e) {
      setError("Erreur d'inscription. Reessaie.");
      setLoading(false);
    }
  }

  async function signupWithGoogle() {
    setError("");
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/" },
      });
      if (error) { setError(error.message); setGoogleLoading(false); }
    } catch (e) {
      setError("Google indisponible pour le moment.");
      setGoogleLoading(false);
    }
  }

  // Ecran de confirmation email
  if (sentEmail) {
    return (
      <div className="auth-page">
        <AuthStyles />
        <AuthVisual />
        <div className="auth-form-panel">
          <div className="auth-confirm">
            <div className="auth-confirm-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#02d1ba" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <div className="auth-confirm-title">Verifie ta boite mail.</div>
            <div className="auth-confirm-sub">
              Un lien de confirmation a ete envoye a<br />
              <span className="auth-confirm-email">{sentEmail}</span>.
              <br /><br />
              Clique sur le lien pour activer ton compte — la page d'inscription peut etre fermee.
            </div>
            <div className="auth-foot">
              Deja confirme ? <a href="/login">Se connecter →</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <AuthStyles />
      <AuthVisual />

      <div className="auth-form-panel">
        <h1 className="auth-title">Creer mon compte</h1>
        <p className="auth-subtitle accent">14 jours gratuits, sans carte bancaire.</p>

        <form onSubmit={onSubmit} noValidate>
          <div style={{ display: "flex", gap: 10 }}>
            <div className="auth-field" style={{ flex: 1 }}>
              <div className="auth-label-row"><label className="auth-label">Prenom</label></div>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="auth-input"
                placeholder="Rayan"
                autoComplete="given-name"
                autoFocus
              />
            </div>
            <div className="auth-field" style={{ flex: 1 }}>
              <div className="auth-label-row"><label className="auth-label">Nom</label></div>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="auth-input"
                placeholder="Bonte"
                autoComplete="family-name"
              />
            </div>
          </div>

          <div className="auth-field">
            <div className="auth-label-row"><label className="auth-label">Email</label></div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              placeholder="ton@email.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="auth-field">
            <div className="auth-label-row"><label className="auth-label">Mot de passe</label></div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
              placeholder="Au moins 8 caracteres"
              autoComplete="new-password"
              required
            />
            {password && (
              <>
                <div className="auth-strength">
                  <div className={`auth-strength-bar ${strength >= 1 ? "on-" + strength : ""}`} />
                  <div className={`auth-strength-bar ${strength >= 2 ? "on-" + strength : ""}`} />
                  <div className={`auth-strength-bar ${strength >= 3 ? "on-" + strength : ""}`} />
                </div>
                <div className="auth-strength-label">Force du mot de passe : {strengthLabel || "…"}</div>
              </>
            )}
          </div>

          <div className="auth-field">
            <div className="auth-label-row"><label className="auth-label">Confirme</label></div>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="auth-input"
              placeholder="Confirme ton mot de passe"
              autoComplete="new-password"
              required
            />
          </div>

          <label className="auth-checkbox-row">
            <input
              type="checkbox"
              className="auth-checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            <span>
              J'accepte les <a href="/legal.html#cgu" target="_blank" rel="noopener">CGU</a> et la <a href="/legal.html#rgpd" target="_blank" rel="noopener">politique de confidentialite</a>.
            </span>
          </label>

          <button type="submit" className="auth-btn" disabled={loading || googleLoading} style={{ marginTop: 20 }}>
            {loading ? "Creation du compte..." : "CREER MON COMPTE"}
          </button>

          {error && <div className="auth-error">{error}</div>}
        </form>

        <div className="auth-sep">ou</div>

        <button onClick={signupWithGoogle} className="auth-btn-ghost" disabled={loading || googleLoading}>
          <GoogleIcon />
          {googleLoading ? "Redirection..." : "Continuer avec Google"}
        </button>

        <div className="auth-foot">
          Deja un compte ? <a href="/login">Se connecter →</a>
        </div>
      </div>
    </div>
  );
}
