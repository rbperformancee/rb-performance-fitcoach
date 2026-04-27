import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useT } from "../../lib/i18n";
import { AuthVisual, AuthStyles, G } from "../auth/AuthShared";

const fillTpl = (s, vars) => {
  let out = s;
  Object.entries(vars).forEach(([k, v]) => { out = out.split(`{${k}}`).join(String(v)); });
  return out;
};

/**
 * JoinPage — page d'inscription client accessible via /join?token=XXXXX
 *
 * Flow:
 *   1. Lit le token depuis window.location.search
 *   2. Verifie via anon key (policy invitations_public_read): status='pending'
 *      AND expires_at > now()
 *   3. Affiche le nom du coach (join sur coaches via coach_id)
 *   4. Formulaire prenom/password/confirm → supabase.auth.signUp
 *   5. Apres succes: INSERT clients avec coach_id + assign programme
 *      si programme_id dans l'invitation
 *   6. Mark invitation status='accepted' via Edge Function OU directement
 *      (ici: on le fait via supabase.rpc ou appel fetch au PATCH; pour
 *      simplifier on fait un UPDATE direct apres signUp — la session
 *      est active donc auth.uid() fonctionne)
 *   7. Redirige vers /
 */
export default function JoinPage() {
  const t = useT();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState(null);
  const [coachName, setCoachName]   = useState("");
  const [coachLogo, setCoachLogo]   = useState(null);
  const [errorMsg, setErrorMsg]     = useState("");

  const [prenom, setPrenom]     = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]   = useState("");

  // Verifie le token au mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) {
      setErrorMsg(t("jp.invalid_link"));
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const { data, error } = await supabase
          .from("invitations")
          .select("id, email, prenom, programme_id, expires_at, status, coach_id")
          .eq("token", token)
          .eq("status", "pending")
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          setErrorMsg(t("jp.invitation_not_found"));
          setLoading(false); return;
        }
        if (new Date(data.expires_at) < new Date()) {
          setErrorMsg(t("jp.invitation_expired"));
          setLoading(false); return;
        }

        setInvitation(data);
        setPrenom(data.prenom || "");

        // Recuperer le nom/logo du coach (public via RLS coaches public_read
        // OU fallback: on tente, si echec on affiche un generique)
        const { data: coachRows } = await supabase
          .from("coaches")
          .select("full_name, coaching_name, logo_url")
          .eq("id", data.coach_id)
          .maybeSingle();
        if (coachRows) {
          setCoachName(coachRows.coaching_name || coachRows.full_name || t("jp.your_coach"));
          setCoachLogo(coachRows.logo_url || null);
        } else {
          setCoachName(t("jp.your_coach"));
        }
      } catch (e) {
        console.error("[JoinPage] token check", e);
        setErrorMsg(t("jp.unable_verify"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    if (!prenom.trim()) { setFormError(t("jp.firstname_required")); return; }
    if (password.length < 8) { setFormError(t("jp.password_min")); return; }
    if (password !== confirm) { setFormError(t("jp.passwords_mismatch")); return; }

    setSubmitting(true);
    try {
      // Cree le compte client
      const { data: signRes, error: signErr } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          data: { full_name: prenom.trim(), invited_by_coach: invitation.coach_id },
        },
      });
      if (signErr) throw signErr;

      const userId = signRes?.user?.id;

      // Cree la ligne clients liee au coach
      if (userId) {
        const clientInsert = {
          id: userId,
          user_id: userId,
          coach_id: invitation.coach_id,
          email: invitation.email,
          full_name: prenom.trim(),
          status: "active",
          subscription_start_date: new Date().toISOString(),
        };
        const { error: cliErr } = await supabase.from("clients").insert(clientInsert);
        if (cliErr && cliErr.code !== "23505") {
          // 23505 = duplicate (client deja cree via trigger eventuel)
          console.warn("[JoinPage] client insert:", cliErr);
        }

        // Assigne le programme si fourni
        if (invitation.programme_id) {
          try {
            // Clone le programme source vers le nouveau client_id
            const { data: srcProg } = await supabase
              .from("programmes")
              .select("html_content, programme_name")
              .eq("id", invitation.programme_id)
              .maybeSingle();
            if (srcProg) {
              await supabase.from("programmes").insert({
                client_id: userId,
                html_content: srcProg.html_content,
                programme_name: srcProg.programme_name,
                is_active: true,
                uploaded_by: "invitation",
              });
            }
          } catch (_) {}
        }

        // Marque invitation comme acceptee
        await supabase
          .from("invitations")
          .update({ status: "accepted", accepted_at: new Date().toISOString() })
          .eq("id", invitation.id);
      }

      // Si signUp renvoie une session immediatement → redirect
      if (signRes?.session) {
        window.location.href = "/";
      } else {
        // Sinon confirmation email (si Supabase est en mode double-opt-in)
        setInvitation({ ...invitation, _sentConfirm: true });
      }
    } catch (e) {
      setFormError(e.message || t("jp.signup_error"));
      setSubmitting(false);
    }
  }

  // ===== RENDER =====

  if (loading) {
    return (
      <div className="auth-page">
        <AuthStyles />
        <AuthVisual />
        <div className="auth-form-panel">
          <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,.4)" }}>
            <div style={{ fontSize: 12, letterSpacing: ".2em", textTransform: "uppercase" }}>{t("jp.verifying")}</div>
          </div>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="auth-page">
        <AuthStyles />
        <AuthVisual />
        <div className="auth-form-panel">
          <div className="auth-confirm">
            <div className="auth-confirm-icon" style={{ borderColor: "rgba(239,68,68,.25)", background: "rgba(239,68,68,.05)" }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="13" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div className="auth-confirm-title">{t("jp.invalid_link_title")}</div>
            <div className="auth-confirm-sub">{errorMsg}</div>
            <div className="auth-foot" style={{ marginTop: 28 }}>
              {t("jp.already_client")} <a href="/login">{t("jp.signin_link")}</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (invitation?._sentConfirm) {
    return (
      <div className="auth-page">
        <AuthStyles />
        <AuthVisual />
        <div className="auth-form-panel">
          <div className="auth-confirm">
            <div className="auth-confirm-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#02d1ba" strokeWidth="2" strokeLinecap="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <div className="auth-confirm-title">{t("jp.check_inbox_title")}</div>
            <div className="auth-confirm-sub">
              {t("jp.confirm_sent")}<br />
              <span className="auth-confirm-email">{invitation.email}</span>.<br /><br />
              {t("jp.click_to_activate")}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <AuthStyles />
      <AuthVisual quote={fillTpl(t("jp.visual_quote"), { coach: coachName })} />

      <div className="auth-form-panel">
        {coachLogo && (
          <img src={coachLogo} alt={coachName} style={{ maxWidth: 180, maxHeight: 48, marginBottom: 20 }} />
        )}

        <div style={{
          fontSize: 9, fontWeight: 700, letterSpacing: ".22em",
          textTransform: "uppercase", color: G, marginBottom: 10,
        }}>
          {t("jp.invitation")}
        </div>
        <h1 className="auth-title">
          {t("jp.welcome_to_space_1")}<br />
          {t("jp.welcome_to_space_2")} <span style={{ color: G }}>{coachName}</span>.
        </h1>
        <p className="auth-subtitle accent">{t("jp.free_forever")}</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <div className="auth-label-row"><label className="auth-label">{t("jp.email_label")}</label></div>
            <input
              type="email"
              value={invitation?.email || ""}
              disabled
              className="auth-input"
              style={{ opacity: .6, cursor: "not-allowed" }}
            />
          </div>

          <div className="auth-field">
            <div className="auth-label-row"><label className="auth-label">{t("jp.firstname_label")}</label></div>
            <input
              type="text"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              className="auth-input"
              placeholder={t("jp.firstname_placeholder")}
              autoFocus={!prenom}
              required
            />
          </div>

          <div className="auth-field">
            <div className="auth-label-row"><label className="auth-label">{t("jp.password_label")}</label></div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
              placeholder={t("jp.password_placeholder")}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="auth-field">
            <div className="auth-label-row"><label className="auth-label">{t("jp.confirm_label")}</label></div>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="auth-input"
              placeholder={t("jp.confirm_placeholder")}
              autoComplete="new-password"
              required
            />
          </div>

          {formError && <div className="auth-error">{formError}</div>}

          <button type="submit" className="auth-btn" disabled={submitting} style={{ marginTop: 16 }}>
            {submitting ? t("jp.creating") : t("jp.create_account")}
          </button>
        </form>

        <div className="auth-foot">
          {t("jp.already_account")} <a href="/login">{t("jp.signin_link")}</a>
        </div>
      </div>
    </div>
  );
}
