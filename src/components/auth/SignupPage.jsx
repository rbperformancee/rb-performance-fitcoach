import React, { useState, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import { AuthVisual, AuthStyles, GoogleIcon } from "./AuthShared";
import { useT } from "../../lib/i18n";
import { addBreadcrumb } from "../../lib/sentry";

/**
 * SignupPage — inscription coach email/password.
 * Route : /signup
 *
 * Apres signUp, Supabase envoie un email de confirmation.
 * On affiche ecran de confirmation avec l'email pour que le
 * coach sache qu'il doit verifier sa boite.
 */
export default function SignupPage() {
  const t = useT();
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
  const strengthLabel = ["", t("signup.strength_weak"), t("signup.strength_medium"), t("signup.strength_strong")][strength];

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (!firstName.trim() || !lastName.trim()) {
      setError(t("signup.err_first_last_required")); return;
    }
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email.trim())) {
      setError(t("signup.err_invalid_email")); return;
    }
    if (password.length < 8) {
      setError(t("signup.err_pw_min")); return;
    }
    if (password !== confirm) {
      setError(t("signup.err_pw_mismatch")); return;
    }
    if (!accepted) {
      setError(t("signup.err_accept_terms")); return;
    }

    setLoading(true);
    addBreadcrumb({ category: "auth", message: "signup_start", level: "info" });
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { full_name: fullName, first_name: firstName.trim(), last_name: lastName.trim() },
          emailRedirectTo: window.location.origin + "/",
        },
      });
      if (error) {
        addBreadcrumb({ category: "auth", message: "signup_failed", data: { reason: error.message }, level: "error" });
        setError(error.message);
        setLoading(false);
        return;
      }
      addBreadcrumb({ category: "auth", message: "signup_ok", data: { hasUser: !!data?.user?.id }, level: "info" });
      // Crée la row coaches IMMÉDIATEMENT (sinon le coach se retrouve bloqué
      // après confirm email — pas de row dans coaches → pas isCoach → écran
      // vide / écran client). UPSERT par email pour idempotence si l'utilisateur
      // re-signup ou s'il y avait déjà un magic link incomplet.
      try {
        const referralCode = (() => {
          try { return new URL(window.location.href).searchParams.get("ref"); }
          catch { return null; }
        })();
        await supabase.from("coaches").upsert({
          email: cleanEmail,
          full_name: fullName,
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          is_active: true,
          subscription_plan: "free",
        }, { onConflict: "email", ignoreDuplicates: false });
        // Track le parrainage si code fourni dans l'URL
        if (referralCode && data?.user?.id) {
          // Le row coaches.id n'est pas encore l'id auth → on link via email + UPDATE id
          // Mais si l'auth trigger fait pas le lien, on stocke le code pour traitement post-confirm
          try { localStorage.setItem("rb_signup_ref_code", referralCode); } catch {}
        }
      } catch (createErr) {
        console.warn("[signup] coach row create failed", createErr);
        // Pas bloquant — l'utilisateur peut toujours confirmer email puis on retentera côté App.jsx
      }
      // Si auto-confirm est OFF (prod), il faut verifier l'email
      if (data?.user && !data.session) {
        setSentEmail(cleanEmail);
        setLoading(false);
        return;
      }
      // Session active immediatement → dashboard
      window.location.href = "/";
    } catch (e) {
      setError(t("signup.err_signup_retry"));
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
      setError(t("signup.err_google_unavailable"));
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
            <div className="auth-confirm-title">{t("signup.confirm_title")}</div>
            <div className="auth-confirm-sub">
              {t("signup.confirm_line1")}<br />
              <span className="auth-confirm-email">{sentEmail}</span>.
              <br /><br />
              {t("signup.confirm_line2")}
            </div>
            <div className="auth-foot">
              {t("signup.already_confirmed")} <a href="/login">{t("signup.signin_link")}</a>
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
        <h1 className="auth-title">{t("signup.title")}</h1>
        <p className="auth-subtitle accent">{t("signup.subtitle")}</p>

        <form onSubmit={onSubmit} noValidate>
          <div style={{ display: "flex", gap: 10 }}>
            <div className="auth-field" style={{ flex: 1 }}>
              <div className="auth-label-row"><label className="auth-label">{t("signup.first_name_label")}</label></div>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="auth-input"
                placeholder={t("signup.first_name_placeholder")}
                autoComplete="given-name"
                autoFocus
              />
            </div>
            <div className="auth-field" style={{ flex: 1 }}>
              <div className="auth-label-row"><label className="auth-label">{t("signup.last_name_label")}</label></div>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="auth-input"
                placeholder={t("signup.last_name_placeholder")}
                autoComplete="family-name"
              />
            </div>
          </div>

          <div className="auth-field">
            <div className="auth-label-row"><label className="auth-label">{t("signup.email_label")}</label></div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              placeholder={t("signup.email_placeholder")}
              autoComplete="email"
              required
            />
          </div>

          <div className="auth-field">
            <div className="auth-label-row"><label className="auth-label">{t("signup.password_label")}</label></div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
              placeholder={t("signup.password_placeholder")}
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
                <div className="auth-strength-label">{t("signup.strength_prefix")} {strengthLabel || "…"}</div>
              </>
            )}
          </div>

          <div className="auth-field">
            <div className="auth-label-row"><label className="auth-label">{t("signup.confirm_label")}</label></div>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="auth-input"
              placeholder={t("signup.confirm_placeholder")}
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
              {t("signup.terms_part1")} <a href="/legal.html#cgu" target="_blank" rel="noopener">{t("signup.terms_cgu")}</a> {t("signup.terms_part2")} <a href="/legal.html#rgpd" target="_blank" rel="noopener">{t("signup.terms_privacy")}</a>.
            </span>
          </label>

          <button type="submit" className="auth-btn" disabled={loading || googleLoading} style={{ marginTop: 20 }}>
            {loading ? t("signup.creating") : t("signup.create_account_btn")}
          </button>

          {error && <div className="auth-error">{error}</div>}
        </form>

        <div className="auth-sep">{t("signup.separator_or")}</div>

        <button onClick={signupWithGoogle} className="auth-btn-ghost" disabled={loading || googleLoading}>
          <GoogleIcon />
          {googleLoading ? t("signup.redirecting") : t("signup.continue_with_google")}
        </button>

        <div className="auth-foot">
          {t("signup.already_account")} <a href="/login">{t("signup.signin_link")}</a>
        </div>
      </div>
    </div>
  );
}
