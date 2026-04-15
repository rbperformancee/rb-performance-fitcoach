import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { AuthVisual, AuthStyles, G } from "../auth/AuthShared";

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
      setErrorMsg("Lien d'invitation invalide.");
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
          setErrorMsg("Invitation introuvable ou deja utilisee.");
          setLoading(false); return;
        }
        if (new Date(data.expires_at) < new Date()) {
          setErrorMsg("Cette invitation a expire. Demande un nouveau lien a ton coach.");
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
          setCoachName(coachRows.coaching_name || coachRows.full_name || "Ton coach");
          setCoachLogo(coachRows.logo_url || null);
        } else {
          setCoachName("Ton coach");
        }
      } catch (e) {
        console.error("[JoinPage] token check", e);
        setErrorMsg("Impossible de verifier l'invitation. Reessaie.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    if (!prenom.trim()) { setFormError("Prenom requis."); return; }
    if (password.length < 8) { setFormError("Mot de passe: minimum 8 caracteres."); return; }
    if (password !== confirm) { setFormError("Les mots de passe ne correspondent pas."); return; }

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
      setFormError(e.message || "Erreur d'inscription. Reessaie.");
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
            <div style={{ fontSize: 12, letterSpacing: ".2em", textTransform: "uppercase" }}>Verification...</div>
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
            <div className="auth-confirm-title">Lien invalide</div>
            <div className="auth-confirm-sub">{errorMsg}</div>
            <div className="auth-foot" style={{ marginTop: 28 }}>
              Tu es deja client ? <a href="/login">Se connecter →</a>
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
            <div className="auth-confirm-title">Verifie ta boite mail.</div>
            <div className="auth-confirm-sub">
              Un lien de confirmation a ete envoye a<br />
              <span className="auth-confirm-email">{invitation.email}</span>.<br /><br />
              Clique sur le lien pour activer ton compte.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <AuthStyles />
      <AuthVisual quote={`Ton espace premium\nsigne ${coachName}.`} />

      <div className="auth-form-panel">
        {coachLogo && (
          <img src={coachLogo} alt={coachName} style={{ maxWidth: 180, maxHeight: 48, marginBottom: 20 }} />
        )}

        <div style={{
          fontSize: 9, fontWeight: 700, letterSpacing: ".22em",
          textTransform: "uppercase", color: G, marginBottom: 10,
        }}>
          Invitation
        </div>
        <h1 className="auth-title">
          Bienvenue sur l'espace<br />
          de <span style={{ color: G }}>{coachName}</span>.
        </h1>
        <p className="auth-subtitle accent">Gratuit pour toi. Toujours.</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <div className="auth-label-row"><label className="auth-label">Email</label></div>
            <input
              type="email"
              value={invitation?.email || ""}
              disabled
              className="auth-input"
              style={{ opacity: .6, cursor: "not-allowed" }}
            />
          </div>

          <div className="auth-field">
            <div className="auth-label-row"><label className="auth-label">Ton prenom</label></div>
            <input
              type="text"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              className="auth-input"
              placeholder="Comment on t'appelle ?"
              autoFocus={!prenom}
              required
            />
          </div>

          <div className="auth-field">
            <div className="auth-label-row"><label className="auth-label">Choisis ton mot de passe</label></div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
              placeholder="Au moins 8 caracteres"
              autoComplete="new-password"
              required
            />
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

          {formError && <div className="auth-error">{formError}</div>}

          <button type="submit" className="auth-btn" disabled={submitting} style={{ marginTop: 16 }}>
            {submitting ? "Creation..." : "CREER MON COMPTE"}
          </button>
        </form>

        <div className="auth-foot">
          Deja un compte ? <a href="/login">Se connecter →</a>
        </div>
      </div>
    </div>
  );
}
